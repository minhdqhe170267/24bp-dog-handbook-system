package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DiseaseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DiseaseService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DiseaseServiceImpl implements DiseaseService {

    private final DiseaseRepository diseaseRepository;
    private final DiseaseSymptomMappingRepository mappingRepository;
    private final SymptomRepository symptomRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DiseaseResponse> getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Disease> diseasePage;

        if (search == null || search.isBlank()) {
            diseasePage = diseaseRepository.findAll(pageable);
        } else {
            diseasePage = diseaseRepository.findByDiseaseNameContainingIgnoreCase(search, pageable);
        }

        List<DiseaseResponse> responses = diseasePage.getContent().stream()
                .map(d -> toDiseaseResponse(d, false))
                .toList();

        return PageResponse.<DiseaseResponse>builder()
                .content(responses)
                .page(diseasePage.getNumber())
                .size(diseasePage.getSize())
                .totalElements(diseasePage.getTotalElements())
                .totalPages(diseasePage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DiseaseResponse getById(Integer id) {
        Disease disease = diseaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh", "id", id));
        return toDiseaseResponse(disease, true);
    }

    @Override
    public DiseaseResponse create(DiseaseRequest request, Integer createdByUserId) {
        User createdBy = userRepository.findById(createdByUserId).orElse(null);

        Disease disease = Disease.builder()
                .diseaseName(request.getDiseaseName())
                .description(request.getDescription())
                .symptomSummary(request.getSymptomSummary())
                .treatmentGuidelines(request.getTreatmentGuidelines())
                .preventionMeasures(request.getPreventionMeasures())
                .severityLevel(parseSeverityLevel(request.getSeverityLevel()))
                .isContagious(request.getIsContagious() != null ? request.getIsContagious() : false)
                .incubationPeriod(request.getIncubationPeriod())
                .createdBy(createdBy)
                .build();

        disease = diseaseRepository.save(disease);
        saveSymptomMappings(disease, request.getSymptomMappings());

        return toDiseaseResponse(disease, true);
    }

    @Override
    public DiseaseResponse update(Integer id, DiseaseRequest request) {
        Disease disease = diseaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh", "id", id));

        disease.setDiseaseName(request.getDiseaseName());
        disease.setDescription(request.getDescription());
        disease.setSymptomSummary(request.getSymptomSummary());
        disease.setTreatmentGuidelines(request.getTreatmentGuidelines());
        disease.setPreventionMeasures(request.getPreventionMeasures());
        disease.setSeverityLevel(parseSeverityLevel(request.getSeverityLevel()));
        disease.setIsContagious(request.getIsContagious() != null ? request.getIsContagious() : false);
        disease.setIncubationPeriod(request.getIncubationPeriod());

        disease = diseaseRepository.save(disease);

        if (request.getSymptomMappings() != null) {
            mappingRepository.deleteByDiseaseDiseaseId(id);
            saveSymptomMappings(disease, request.getSymptomMappings());
        }

        return toDiseaseResponse(disease, true);
    }

    @Override
    public void delete(Integer id) {
        Disease disease = diseaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh", "id", id));
        disease.setIsDeleted(true);
        disease.setDeletedAt(LocalDateTime.now());
        diseaseRepository.save(disease);
    }

    // ── Helpers ──────────────────────────────────────────────

    private void saveSymptomMappings(Disease disease, List<DiseaseRequest.SymptomMappingItem> items) {
        if (items == null || items.isEmpty()) return;

        List<Integer> symptomIds = items.stream().map(DiseaseRequest.SymptomMappingItem::getSymptomId).toList();
        List<Symptom> symptoms = symptomRepository.findBySymptomIdIn(symptomIds);

        for (DiseaseRequest.SymptomMappingItem item : items) {
            Symptom symptom = symptoms.stream()
                    .filter(s -> s.getSymptomId().equals(item.getSymptomId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Triệu chứng", "id", item.getSymptomId()));

            DiseaseSymptomMapping mapping = DiseaseSymptomMapping.builder()
                    .disease(disease)
                    .symptom(symptom)
                    .weight(item.getWeight() != null ? BigDecimal.valueOf(item.getWeight()) : new BigDecimal("0.50"))
                    .isPrimary(item.getIsPrimary() != null ? item.getIsPrimary() : false)
                    .notes(item.getNotes())
                    .build();

            mappingRepository.save(mapping);
        }
    }

    private DiseaseResponse toDiseaseResponse(Disease entity, boolean includeSymptoms) {
        List<DiseaseResponse.DiseaseSymptomItem> symptomItems = Collections.emptyList();
        if (includeSymptoms) {
            List<DiseaseSymptomMapping> mappings = mappingRepository.findByDisease(entity);
            symptomItems = mappings.stream()
                    .map(m -> DiseaseResponse.DiseaseSymptomItem.builder()
                            .symptomId(m.getSymptom().getSymptomId())
                            .symptomName(m.getSymptom().getSymptomName())
                            .weight(m.getWeight() != null ? m.getWeight().doubleValue() : null)
                            .isPrimary(m.getIsPrimary())
                            .build())
                    .toList();
        }

        return DiseaseResponse.builder()
                .diseaseId(entity.getDiseaseId())
                .diseaseName(entity.getDiseaseName())
                .severityLevel(entity.getSeverityLevel() != null ? entity.getSeverityLevel().name() : null)
                .description(entity.getDescription())
                .symptomSummary(entity.getSymptomSummary())
                .treatmentGuidelines(entity.getTreatmentGuidelines())
                .preventionMeasures(entity.getPreventionMeasures())
                .isContagious(entity.getIsContagious())
                .incubationPeriod(entity.getIncubationPeriod())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .createdByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getFullName() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .symptoms(symptomItems)
                .build();
    }

    private SeverityLevel parseSeverityLevel(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return SeverityLevel.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Mức độ nghiêm trọng không hợp lệ: " + value);
        }
    }
}
