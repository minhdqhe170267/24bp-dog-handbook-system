package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomCheckerRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomCheckerResponse;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.service.SymptomCheckerService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SymptomCheckerServiceImpl implements SymptomCheckerService {

    private final SymptomRepository symptomRepository;
    private final DiseaseSymptomMappingRepository diseaseSymptomMappingRepository;

    @Override
    public SymptomCheckerResponse check(SymptomCheckerRequest request) {
        // 1. Validate input symptoms exist
        List<Symptom> inputSymptoms = symptomRepository.findBySymptomIdIn(request.getSymptomIds());
        if (inputSymptoms.isEmpty()) {
            throw new BadRequestException("Không tìm thấy triệu chứng nào với các ID đã cung cấp");
        }

        Set<Integer> inputSymptomIds = inputSymptoms.stream()
                .map(Symptom::getSymptomId)
                .collect(Collectors.toSet());

        // 2. Find all disease-symptom mappings related to input symptoms
        List<DiseaseSymptomMapping> relatedLinks = diseaseSymptomMappingRepository
                .findBySymptomSymptomIdIn(request.getSymptomIds());

        if (relatedLinks.isEmpty()) {
            return SymptomCheckerResponse.builder()
                    .possibleDiseases(List.of())
                    .urgencyLevel("LOW")
                    .recommendation("Không tìm thấy bệnh liên quan đến các triệu chứng đã chọn. "
                            + "Nếu triệu chứng kéo dài, hãy đưa chó đi khám bác sĩ thú y.")
                    .totalSymptomsChecked(inputSymptoms.size())
                    .build();
        }

        // 3. Group by disease
        Map<Integer, List<DiseaseSymptomMapping>> diseaseMap = relatedLinks.stream()
                .collect(Collectors.groupingBy(ds -> ds.getDisease().getDiseaseId()));

        // 4. Build diagnosis results
        List<SymptomCheckerResponse.DiagnosisResult> results = new ArrayList<>();

        for (Map.Entry<Integer, List<DiseaseSymptomMapping>> entry : diseaseMap.entrySet()) {
            Disease disease = entry.getValue().get(0).getDisease();

            // Skip deleted diseases
            if (disease.getIsDeleted() != null && disease.getIsDeleted()) {
                continue;
            }

            // Load all symptoms of this disease
            List<DiseaseSymptomMapping> allDiseaseSymptoms = diseaseSymptomMappingRepository
                    .findByDisease(disease);

            int totalDiseaseSymptoms = allDiseaseSymptoms.size();
            if (totalDiseaseSymptoms == 0) continue;

            // Calculate matched symptoms
            List<String> matchedNames = new ArrayList<>();
            List<String> missingNames = new ArrayList<>();

            for (DiseaseSymptomMapping mapping : allDiseaseSymptoms) {
                if (inputSymptomIds.contains(mapping.getSymptom().getSymptomId())) {
                    matchedNames.add(mapping.getSymptom().getSymptomName());
                } else {
                    missingNames.add(mapping.getSymptom().getSymptomName());
                }
            }

            int matchedCount = matchedNames.size();
            double matchPercentage = (matchedCount * 100.0) / totalDiseaseSymptoms;

            // Only include diseases with >= 30% match
            if (matchPercentage < 30.0) continue;

            results.add(SymptomCheckerResponse.DiagnosisResult.builder()
                    .diseaseId(disease.getDiseaseId())
                    .diseaseName(disease.getDiseaseName())
                    .severityLevel(disease.getSeverityLevel() != null ? disease.getSeverityLevel().name() : null)
                    .matchPercentage(Math.round(matchPercentage * 100.0) / 100.0)
                    .matchedSymptoms(matchedCount)
                    .totalDiseaseSymptoms(totalDiseaseSymptoms)
                    .matchedSymptomNames(matchedNames)
                    .missingSymptomNames(missingNames)
                    .treatmentGuidelines(disease.getTreatmentGuidelines())
                    .preventionMeasures(disease.getPreventionMeasures())
                    .build());
        }

        // 5. Sort by matchPercentage descending
        results.sort(Comparator.comparingDouble(SymptomCheckerResponse.DiagnosisResult::getMatchPercentage).reversed());

        // 6. Determine urgency level
        String urgencyLevel = determineUrgencyLevel(results);

        // 7. Generate recommendation
        String recommendation = generateRecommendation(urgencyLevel, results);

        return SymptomCheckerResponse.builder()
                .possibleDiseases(results)
                .urgencyLevel(urgencyLevel)
                .recommendation(recommendation)
                .totalSymptomsChecked(inputSymptoms.size())
                .build();
    }

    private String determineUrgencyLevel(List<SymptomCheckerResponse.DiagnosisResult> results) {
        for (SymptomCheckerResponse.DiagnosisResult r : results) {
            if ("CRITICAL".equals(r.getSeverityLevel()) && r.getMatchPercentage() >= 60) {
                return "EMERGENCY";
            }
        }
        for (SymptomCheckerResponse.DiagnosisResult r : results) {
            if ("HIGH".equals(r.getSeverityLevel()) && r.getMatchPercentage() >= 50) {
                return "HIGH";
            }
        }
        for (SymptomCheckerResponse.DiagnosisResult r : results) {
            if ("MEDIUM".equals(r.getSeverityLevel()) && r.getMatchPercentage() >= 40) {
                return "MEDIUM";
            }
        }
        return "LOW";
    }

    private String generateRecommendation(String urgencyLevel,
                                          List<SymptomCheckerResponse.DiagnosisResult> results) {
        return switch (urgencyLevel) {
            case "EMERGENCY" -> {
                SymptomCheckerResponse.DiagnosisResult critical = results.stream()
                        .filter(r -> "CRITICAL".equals(r.getSeverityLevel()) && r.getMatchPercentage() >= 60)
                        .findFirst().orElse(results.get(0));
                String actions = critical.getPreventionMeasures() != null
                        ? critical.getPreventionMeasures() : "Theo dõi sát sao";
                yield "KHẨN CẤP: Có dấu hiệu bệnh nghiêm trọng (" + critical.getDiseaseName()
                        + "). Đưa chó đến bác sĩ thú y NGAY LẬP TỨC. Trong khi chờ: " + actions;
            }
            case "HIGH" -> {
                String topDiseases = results.stream()
                        .limit(3)
                        .map(SymptomCheckerResponse.DiagnosisResult::getDiseaseName)
                        .collect(Collectors.joining(", "));
                yield "Phát hiện triệu chứng đáng lo ngại. Nên đưa chó đi khám trong 24h tới. "
                        + "Bệnh có thể: " + topDiseases;
            }
            case "MEDIUM" ->
                    "Một số triệu chứng cần theo dõi. Nếu không cải thiện trong 2-3 ngày, nên đưa đi khám.";
            default ->
                    "Triệu chứng nhẹ, có thể theo dõi tại nhà. Đảm bảo chó được nghỉ ngơi và dinh dưỡng đầy đủ.";
        };
    }
}
