package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomCheckerRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomCheckerResponse;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseFirstAidMapping;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseMedicationMapping;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseFirstAidMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseMedicationMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.SymptomCheckerServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SymptomCheckerServiceImplTest {

    @Mock private SymptomRepository symptomRepository;
    @Mock private DiseaseSymptomMappingRepository diseaseSymptomMappingRepository;
    @Mock private DiseaseMedicationMappingRepository diseaseMedicationMappingRepository;
    @Mock private DiseaseFirstAidMappingRepository diseaseFirstAidMappingRepository;

    @InjectMocks
    private SymptomCheckerServiceImpl symptomCheckerService;

    // Symptoms
    private Symptom symptomVomiting;
    private Symptom symptomDiarrhea;
    private Symptom symptomCoughing;
    private Symptom symptomFever;
    private Symptom symptomLethargy;

    // Diseases
    private Disease parvo;
    private Disease rabies;
    private Disease kennelCough;

    // Medications & First Aid
    private Medication publishedMedication;
    private Medication draftMedication;
    private FirstAidGuide publishedGuide;
    private FirstAidGuide draftGuide;

    @BeforeEach
    void setUp() {
        // Symptoms
        symptomVomiting = Symptom.builder().symptomId(1).symptomCode("SYM001").symptomName("Vomiting").build();
        symptomDiarrhea = Symptom.builder().symptomId(2).symptomCode("SYM002").symptomName("Diarrhea").build();
        symptomCoughing = Symptom.builder().symptomId(3).symptomCode("SYM003").symptomName("Coughing").build();
        symptomFever = Symptom.builder().symptomId(4).symptomCode("SYM004").symptomName("Fever").build();
        symptomLethargy = Symptom.builder().symptomId(5).symptomCode("SYM005").symptomName("Lethargy").build();

        // Diseases
        parvo = Disease.builder()
                .diseaseId(1).diseaseName("Parvo")
                .severityLevel(SeverityLevel.CRITICAL).isDeleted(false)
                .status(ContentStatus.PUBLISHED)
                .treatmentGuidelines("IV fluids").preventionMeasures("Vaccinate")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        rabies = Disease.builder()
                .diseaseId(2).diseaseName("Rabies")
                .severityLevel(SeverityLevel.HIGH).isDeleted(false)
                .status(ContentStatus.PUBLISHED)
                .treatmentGuidelines("Quarantine").preventionMeasures("Annual vaccine")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        kennelCough = Disease.builder()
                .diseaseId(3).diseaseName("Kennel Cough")
                .severityLevel(SeverityLevel.LOW).isDeleted(false)
                .status(ContentStatus.PUBLISHED)
                .treatmentGuidelines("Rest").preventionMeasures("Avoid crowded kennels")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        // Medications
        publishedMedication = Medication.builder()
                .medicationId(10).medicationName("Amoxicillin")
                .dosageInstructions("10mg/kg").administrationMethod("Oral")
                .status(ContentStatus.PUBLISHED).build();

        draftMedication = Medication.builder()
                .medicationId(11).medicationName("Draft Med")
                .dosageInstructions("5mg/kg").administrationMethod("Injection")
                .status(ContentStatus.DRAFT).build();

        // First Aid Guides
        publishedGuide = FirstAidGuide.builder()
                .guideId(20).guideTitle("Dehydration Guide")
                .emergencyType("Dehydration").immediateSteps("Provide fluids")
                .status(ContentStatus.PUBLISHED).build();

        draftGuide = FirstAidGuide.builder()
                .guideId(21).guideTitle("Draft Guide")
                .emergencyType("Unknown").immediateSteps("TBD")
                .status(ContentStatus.DRAFT).build();
    }

    private SymptomCheckerRequest buildRequest(List<Integer> symptomIds) {
        SymptomCheckerRequest request = new SymptomCheckerRequest();
        request.setSymptomIds(symptomIds);
        return request;
    }

    // Helper: build disease-symptom mappings for a disease with given symptoms
    private List<DiseaseSymptomMapping> buildMappings(Disease disease, List<Symptom> symptoms) {
        return symptoms.stream()
                .map(s -> DiseaseSymptomMapping.builder()
                        .mappingId(disease.getDiseaseId() * 100 + s.getSymptomId())
                        .disease(disease)
                        .symptom(s)
                        .weight(new BigDecimal("0.50"))
                        .isPrimary(false)
                        .build())
                .toList();
    }

    // ── check ───────────────────────────────────────────────────

    @Nested
    class Check {

        @Test
        void happyPath_singleDisease_100PercentMatch() {
            // Parvo has 2 symptoms: vomiting + diarrhea. User sends both.
            SymptomCheckerRequest request = buildRequest(List.of(1, 2));
            List<DiseaseSymptomMapping> parvoMappings = buildMappings(parvo, List.of(symptomVomiting, symptomDiarrhea));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2)))
                    .thenReturn(parvoMappings);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(parvoMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getPossibleDiseases()).hasSize(1);
            assertThat(result.getPossibleDiseases().get(0).getDiseaseName()).isEqualTo("Parvo");
            assertThat(result.getPossibleDiseases().get(0).getMatchPercentage()).isEqualTo(100.0);
            assertThat(result.getTotalSymptomsChecked()).isEqualTo(2);
        }

        @Test
        void noSymptomsFound_throwsBadRequestException() {
            SymptomCheckerRequest request = buildRequest(List.of(999, 998));

            when(symptomRepository.findBySymptomIdIn(List.of(999, 998)))
                    .thenReturn(Collections.emptyList());

            assertThatThrownBy(() -> symptomCheckerService.check(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Không tìm thấy triệu chứng nào");
        }

        @Test
        void noRelatedDiseases_returnsEmptyListWithLowUrgency() {
            SymptomCheckerRequest request = buildRequest(List.of(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getPossibleDiseases()).isEmpty();
            assertThat(result.getUrgencyLevel()).isEqualTo("LOW");
            assertThat(result.getTotalSymptomsChecked()).isEqualTo(1);
            assertThat(result.getRecommendation()).contains("Không tìm thấy bệnh liên quan");
        }

        @Test
        void matchBelow30Percent_filteredOut() {
            // Disease has 5 symptoms, user matches only 1 => 20% < 30% => filtered out
            List<Symptom> allParvoSymptoms = List.of(
                    symptomVomiting, symptomDiarrhea, symptomCoughing, symptomFever, symptomLethargy
            );
            List<DiseaseSymptomMapping> allMappings = buildMappings(parvo, allParvoSymptoms);

            // User only sends symptom 1 (vomiting)
            SymptomCheckerRequest request = buildRequest(List.of(1));
            // Related links: only mapping for symptom 1
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(allMappings);

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            // 1/5 = 20% < 30% => no diseases returned
            assertThat(result.getPossibleDiseases()).isEmpty();
            assertThat(result.getUrgencyLevel()).isEqualTo("LOW");
        }

        @Test
        void matchAt30PercentBoundary_included() {
            // Disease has 3 symptoms, user matches 1 => 33.33% >= 30% => included
            List<Symptom> diseaseSymptoms = List.of(symptomVomiting, symptomDiarrhea, symptomCoughing);
            List<DiseaseSymptomMapping> allMappings = buildMappings(kennelCough, diseaseSymptoms);

            SymptomCheckerRequest request = buildRequest(List.of(1));
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(kennelCough))
                    .thenReturn(allMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(3)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(3)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getPossibleDiseases()).hasSize(1);
            assertThat(result.getPossibleDiseases().get(0).getMatchPercentage()).isGreaterThanOrEqualTo(30.0);
        }

        @Test
        void deletedDisease_skipped() {
            Disease deletedDisease = Disease.builder()
                    .diseaseId(99).diseaseName("Deleted Disease")
                    .severityLevel(SeverityLevel.HIGH).isDeleted(true)
                    .status(ContentStatus.PUBLISHED)
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .build();

            List<DiseaseSymptomMapping> mappings = buildMappings(deletedDisease, List.of(symptomVomiting));

            SymptomCheckerRequest request = buildRequest(List.of(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(mappings);
            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getPossibleDiseases()).isEmpty();
            assertThat(result.getUrgencyLevel()).isEqualTo("LOW");
        }

        @Test
        void sortedByMatchPercentageDescending() {
            // parvo: 2/2 = 100%, kennelCough: 1/2 = 50%
            List<DiseaseSymptomMapping> parvoMappings = buildMappings(parvo, List.of(symptomVomiting, symptomDiarrhea));
            List<DiseaseSymptomMapping> kcMappings = buildMappings(kennelCough, List.of(symptomVomiting, symptomCoughing));

            SymptomCheckerRequest request = buildRequest(List.of(1, 2));

            // Related links: parvo(vomiting, diarrhea) + kennelCough(vomiting only)
            List<DiseaseSymptomMapping> relatedLinks = List.of(
                    parvoMappings.get(0), parvoMappings.get(1), kcMappings.get(0)
            );

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(parvoMappings);
            when(diseaseSymptomMappingRepository.findByDisease(kennelCough))
                    .thenReturn(kcMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(anyList()))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(anyList()))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getPossibleDiseases()).hasSize(2);
            assertThat(result.getPossibleDiseases().get(0).getDiseaseName()).isEqualTo("Parvo");
            assertThat(result.getPossibleDiseases().get(0).getMatchPercentage())
                    .isGreaterThan(result.getPossibleDiseases().get(1).getMatchPercentage());
        }

        @Test
        void urgencyLevel_EMERGENCY_criticalDiseaseWith60PercentMatch() {
            // Parvo is CRITICAL, 2/3 matched = 66.67% >= 60% => EMERGENCY
            List<Symptom> parvoSymptoms = List.of(symptomVomiting, symptomDiarrhea, symptomFever);
            List<DiseaseSymptomMapping> allMappings = buildMappings(parvo, parvoSymptoms);

            SymptomCheckerRequest request = buildRequest(List.of(1, 2));
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0), allMappings.get(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(allMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getUrgencyLevel()).isEqualTo("EMERGENCY");
            assertThat(result.getRecommendation()).contains("KHẨN CẤP");
        }

        @Test
        void urgencyLevel_HIGH_highSeverityWith50PercentMatch() {
            // Rabies is HIGH severity, 1/2 matched = 50% >= 50% => HIGH
            List<DiseaseSymptomMapping> rabiesMappings = buildMappings(rabies, List.of(symptomVomiting, symptomFever));

            SymptomCheckerRequest request = buildRequest(List.of(1));
            List<DiseaseSymptomMapping> relatedLinks = List.of(rabiesMappings.get(0));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(rabies))
                    .thenReturn(rabiesMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(2)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(2)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getUrgencyLevel()).isEqualTo("HIGH");
            assertThat(result.getRecommendation()).contains("24h");
        }

        @Test
        void urgencyLevel_MEDIUM_mediumSeverityWith40PercentMatch() {
            Disease mediumDisease = Disease.builder()
                    .diseaseId(50).diseaseName("Medium Illness")
                    .severityLevel(SeverityLevel.MEDIUM).isDeleted(false)
                    .status(ContentStatus.PUBLISHED)
                    .treatmentGuidelines("Rest").preventionMeasures("Hygiene")
                    .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .build();

            // 2/5 = 40% match
            List<Symptom> diseaseSymptoms = List.of(
                    symptomVomiting, symptomDiarrhea, symptomCoughing, symptomFever, symptomLethargy
            );
            List<DiseaseSymptomMapping> allMappings = buildMappings(mediumDisease, diseaseSymptoms);

            SymptomCheckerRequest request = buildRequest(List.of(1, 2));
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0), allMappings.get(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(mediumDisease))
                    .thenReturn(allMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(50)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(50)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getUrgencyLevel()).isEqualTo("MEDIUM");
            assertThat(result.getRecommendation()).contains("2-3 ngày");
        }

        @Test
        void urgencyLevel_LOW_lowSeverityDisease() {
            // kennelCough is LOW severity, 1/1 = 100% match but LOW severity => LOW urgency
            List<DiseaseSymptomMapping> kcMappings = buildMappings(kennelCough, List.of(symptomCoughing));

            SymptomCheckerRequest request = buildRequest(List.of(3));

            when(symptomRepository.findBySymptomIdIn(List.of(3)))
                    .thenReturn(List.of(symptomCoughing));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(3)))
                    .thenReturn(kcMappings);
            when(diseaseSymptomMappingRepository.findByDisease(kennelCough))
                    .thenReturn(kcMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(3)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(3)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getUrgencyLevel()).isEqualTo("LOW");
            assertThat(result.getRecommendation()).contains("theo dõi tại nhà");
        }

        @Test
        void medicationsAndFirstAid_onlyPublishedIncluded() {
            List<DiseaseSymptomMapping> parvoMappings = buildMappings(parvo, List.of(symptomVomiting));

            DiseaseMedicationMapping pubMedMapping = DiseaseMedicationMapping.builder()
                    .mappingId(1).disease(parvo).medication(publishedMedication).priority(1).notes("Primary")
                    .build();
            DiseaseMedicationMapping draftMedMapping = DiseaseMedicationMapping.builder()
                    .mappingId(2).disease(parvo).medication(draftMedication).priority(2).notes("Secondary")
                    .build();

            DiseaseFirstAidMapping pubFaMapping = DiseaseFirstAidMapping.builder()
                    .mappingId(1).disease(parvo).firstAidGuide(publishedGuide).priority(1).notes("Main")
                    .build();
            DiseaseFirstAidMapping draftFaMapping = DiseaseFirstAidMapping.builder()
                    .mappingId(2).disease(parvo).firstAidGuide(draftGuide).priority(2).notes("Extra")
                    .build();

            SymptomCheckerRequest request = buildRequest(List.of(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(parvoMappings);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(parvoMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(List.of(pubMedMapping, draftMedMapping));
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(List.of(pubFaMapping, draftFaMapping));

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            SymptomCheckerResponse.DiagnosisResult diagnosis = result.getPossibleDiseases().get(0);

            // Only PUBLISHED medication included
            assertThat(diagnosis.getRecommendedMedications()).hasSize(1);
            assertThat(diagnosis.getRecommendedMedications().get(0).getMedicationName()).isEqualTo("Amoxicillin");
            assertThat(diagnosis.getRecommendedMedications().get(0).getDosageInstructions()).isEqualTo("10mg/kg");

            // Only PUBLISHED guide included
            assertThat(diagnosis.getRecommendedFirstAidGuides()).hasSize(1);
            assertThat(diagnosis.getRecommendedFirstAidGuides().get(0).getGuideTitle()).isEqualTo("Dehydration Guide");
        }

        @Test
        void diagnosisResult_containsMatchedAndMissingSymptomNames() {
            // Parvo has 3 symptoms, user matches 2
            List<Symptom> parvoSymptoms = List.of(symptomVomiting, symptomDiarrhea, symptomFever);
            List<DiseaseSymptomMapping> allMappings = buildMappings(parvo, parvoSymptoms);

            SymptomCheckerRequest request = buildRequest(List.of(1, 2));
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0), allMappings.get(1));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(allMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            SymptomCheckerResponse.DiagnosisResult diagnosis = result.getPossibleDiseases().get(0);
            assertThat(diagnosis.getMatchedSymptoms()).isEqualTo(2);
            assertThat(diagnosis.getTotalDiseaseSymptoms()).isEqualTo(3);
            assertThat(diagnosis.getMatchedSymptomNames()).containsExactlyInAnyOrder("Vomiting", "Diarrhea");
            assertThat(diagnosis.getMissingSymptomNames()).containsExactly("Fever");
        }

        @Test
        void totalSymptomsChecked_reflectsInputCount() {
            SymptomCheckerRequest request = buildRequest(List.of(1, 2, 3));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 2, 3)))
                    .thenReturn(List.of(symptomVomiting, symptomDiarrhea, symptomCoughing));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 2, 3)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getTotalSymptomsChecked()).isEqualTo(3);
        }

        @Test
        void partialSymptomIdsFound_usesOnlyFoundSymptoms() {
            // Request has ids 1 and 999, but only id 1 exists in DB
            SymptomCheckerRequest request = buildRequest(List.of(1, 999));

            when(symptomRepository.findBySymptomIdIn(List.of(1, 999)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1, 999)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            assertThat(result.getTotalSymptomsChecked()).isEqualTo(1);
            assertThat(result.getUrgencyLevel()).isEqualTo("LOW");
        }

        @Test
        void criticalDiseaseBelow60Percent_notEmergency() {
            // Parvo is CRITICAL but only 1/3 matched = 33% < 60% => not EMERGENCY
            List<Symptom> parvoSymptoms = List.of(symptomVomiting, symptomDiarrhea, symptomFever);
            List<DiseaseSymptomMapping> allMappings = buildMappings(parvo, parvoSymptoms);

            SymptomCheckerRequest request = buildRequest(List.of(1));
            List<DiseaseSymptomMapping> relatedLinks = List.of(allMappings.get(0));

            when(symptomRepository.findBySymptomIdIn(List.of(1)))
                    .thenReturn(List.of(symptomVomiting));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(relatedLinks);
            when(diseaseSymptomMappingRepository.findByDisease(parvo))
                    .thenReturn(allMappings);
            when(diseaseMedicationMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());
            when(diseaseFirstAidMappingRepository.findByDiseaseDiseaseIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            SymptomCheckerResponse result = symptomCheckerService.check(request);

            // 33% >= 30% so disease is included, but CRITICAL at 33% < 60% => not EMERGENCY
            assertThat(result.getPossibleDiseases()).hasSize(1);
            assertThat(result.getUrgencyLevel()).isNotEqualTo("EMERGENCY");
        }
    }
}
