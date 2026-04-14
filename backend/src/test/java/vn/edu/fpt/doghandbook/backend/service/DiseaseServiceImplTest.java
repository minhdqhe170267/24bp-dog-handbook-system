package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DiseaseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseFirstAidMapping;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseMedicationMapping;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseFirstAidMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseMedicationMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DiseaseServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiseaseServiceImplTest {

    @Mock private DiseaseRepository diseaseRepository;
    @Mock private DiseaseSymptomMappingRepository mappingRepository;
    @Mock private DiseaseMedicationMappingRepository medicationMappingRepository;
    @Mock private DiseaseFirstAidMappingRepository firstAidMappingRepository;
    @Mock private SymptomRepository symptomRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private DiseaseServiceImpl diseaseService;

    private User testUser;
    private Disease draftDisease;
    private Disease publishedDisease;
    private Disease rejectedDisease;
    private Symptom testSymptom;
    private Medication testMedication;
    private FirstAidGuide testGuide;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId(1)
                .username("editor")
                .fullName("Test Editor")
                .passwordHash("hash")
                .build();

        draftDisease = Disease.builder()
                .diseaseId(1)
                .diseaseName("Parvo")
                .description("Parvovirus infection")
                .severityLevel(SeverityLevel.HIGH)
                .isContagious(true)
                .status(ContentStatus.DRAFT)
                .isDeleted(false)
                .createdBy(testUser)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        publishedDisease = Disease.builder()
                .diseaseId(2)
                .diseaseName("Rabies")
                .description("Rabies virus")
                .severityLevel(SeverityLevel.CRITICAL)
                .isContagious(true)
                .status(ContentStatus.PUBLISHED)
                .isDeleted(false)
                .createdBy(testUser)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        rejectedDisease = Disease.builder()
                .diseaseId(3)
                .diseaseName("Kennel Cough")
                .description("Upper respiratory infection")
                .severityLevel(SeverityLevel.LOW)
                .isContagious(true)
                .status(ContentStatus.REJECTED)
                .isDeleted(false)
                .createdBy(testUser)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testSymptom = Symptom.builder()
                .symptomId(10)
                .symptomCode("SYM001")
                .symptomName("Vomiting")
                .build();

        testMedication = Medication.builder()
                .medicationId(20)
                .medicationName("Amoxicillin")
                .dosageInstructions("10mg/kg")
                .administrationMethod("Oral")
                .build();

        testGuide = FirstAidGuide.builder()
                .guideId(30)
                .guideTitle("CPR for Dogs")
                .emergencyType("Cardiac")
                .immediateSteps("Check breathing")
                .build();
    }

    // ── getAll ──────────────────────────────────────────────────

    @Nested
    class GetAll {

        @Test
        void happyPath_noSearch_returnsPagedResults() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Disease> page = new PageImpl<>(List.of(draftDisease), pageable, 1);

            when(diseaseRepository.findAll(pageable)).thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(0, 10, null);

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getPage()).isZero();
            assertThat(result.getSize()).isEqualTo(10);
            DiseaseResponse response = (DiseaseResponse) result.getContent().get(0);
            assertThat(response.getDiseaseName()).isEqualTo("Parvo");
        }

        @Test
        void withSearchKeyword_delegatesToSearchQuery() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Disease> page = new PageImpl<>(List.of(draftDisease), pageable, 1);

            when(diseaseRepository.findByDiseaseNameContainingIgnoreCase("Parvo", pageable))
                    .thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(0, 10, "Parvo");

            assertThat(result.getTotalElements()).isEqualTo(1);
            DiseaseResponse response = (DiseaseResponse) result.getContent().get(0);
            assertThat(response.getDiseaseName()).isEqualTo("Parvo");
            verify(diseaseRepository, never()).findAll(any(Pageable.class));
        }

        @Test
        void emptySearch_treatedAsNoSearch() {
            Pageable pageable = PageRequest.of(0, 5);
            Page<Disease> page = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(diseaseRepository.findAll(pageable)).thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(0, 5, "   ");

            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalElements()).isZero();
        }

        @Test
        void emptyResult_returnsEmptyPage() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Disease> page = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(diseaseRepository.findAll(pageable)).thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(0, 10, null);

            assertThat(result.getContent()).isEmpty();
            assertThat(result.getTotalPages()).isZero();
        }

        @Test
        void multiplePages_returnsCorrectPageInfo() {
            Pageable pageable = PageRequest.of(1, 1);
            Page<Disease> page = new PageImpl<>(List.of(publishedDisease), pageable, 3);

            when(diseaseRepository.findAll(pageable)).thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(1, 1, null);

            assertThat(result.getPage()).isEqualTo(1);
            assertThat(result.getSize()).isEqualTo(1);
            assertThat(result.getTotalElements()).isEqualTo(3);
            assertThat(result.getTotalPages()).isEqualTo(3);
        }

        @Test
        void responseContainsCorrectSeverityLevelString() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Disease> page = new PageImpl<>(List.of(draftDisease), pageable, 1);

            when(diseaseRepository.findAll(pageable)).thenReturn(page);

            PageResponse<DiseaseResponse> result = diseaseService.getAll(0, 10, null);

            DiseaseResponse response = (DiseaseResponse) result.getContent().get(0);
            assertThat(response.getSeverityLevel()).isEqualTo("HIGH");
            assertThat(response.getStatus()).isEqualTo("DRAFT");
        }
    }

    // ── getById ─────────────────────────────────────────────────

    @Nested
    class GetById {

        @Test
        void happyPath_returnsResponseWithDetails() {
            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(mappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.getById(1);

            assertThat(result.getDiseaseId()).isEqualTo(1);
            assertThat(result.getDiseaseName()).isEqualTo("Parvo");
            assertThat(result.getIsContagious()).isTrue();
            assertThat(result.getCreatedByName()).isEqualTo("Test Editor");
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(diseaseRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diseaseService.getById(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Bệnh");
        }

        @Test
        void returnsSymptomMappings() {
            DiseaseSymptomMapping mapping = DiseaseSymptomMapping.builder()
                    .mappingId(1)
                    .disease(draftDisease)
                    .symptom(testSymptom)
                    .weight(new BigDecimal("0.80"))
                    .isPrimary(true)
                    .build();

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(mappingRepository.findByDisease(draftDisease)).thenReturn(List.of(mapping));
            when(medicationMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.getById(1);

            assertThat(result.getSymptoms()).hasSize(1);
            assertThat(result.getSymptoms().get(0).getSymptomName()).isEqualTo("Vomiting");
            assertThat(result.getSymptoms().get(0).getWeight()).isEqualTo(0.80);
            assertThat(result.getSymptoms().get(0).getIsPrimary()).isTrue();
        }

        @Test
        void returnsMedicationMappings() {
            DiseaseMedicationMapping medMapping = DiseaseMedicationMapping.builder()
                    .mappingId(1)
                    .disease(draftDisease)
                    .medication(testMedication)
                    .priority(1)
                    .notes("Primary medication")
                    .build();

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(mappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(draftDisease)).thenReturn(List.of(medMapping));
            when(firstAidMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.getById(1);

            assertThat(result.getMedications()).hasSize(1);
            assertThat(result.getMedications().get(0).getMedicationName()).isEqualTo("Amoxicillin");
            assertThat(result.getMedications().get(0).getDosageInstructions()).isEqualTo("10mg/kg");
        }

        @Test
        void returnsFirstAidMappings() {
            DiseaseFirstAidMapping faMapping = DiseaseFirstAidMapping.builder()
                    .mappingId(1)
                    .disease(draftDisease)
                    .firstAidGuide(testGuide)
                    .priority(1)
                    .notes("Emergency guide")
                    .build();

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(mappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(draftDisease)).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(draftDisease)).thenReturn(List.of(faMapping));

            DiseaseResponse result = diseaseService.getById(1);

            assertThat(result.getFirstAidGuides()).hasSize(1);
            assertThat(result.getFirstAidGuides().get(0).getGuideTitle()).isEqualTo("CPR for Dogs");
            assertThat(result.getFirstAidGuides().get(0).getEmergencyType()).isEqualTo("Cardiac");
        }

        @Test
        void diseaseWithNullSeverityLevel_handledGracefully() {
            Disease nullSeverityDisease = Disease.builder()
                    .diseaseId(10)
                    .diseaseName("Unknown Disease")
                    .severityLevel(null)
                    .status(ContentStatus.DRAFT)
                    .isDeleted(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(diseaseRepository.findById(10)).thenReturn(Optional.of(nullSeverityDisease));
            when(mappingRepository.findByDisease(nullSeverityDisease)).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(nullSeverityDisease)).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(nullSeverityDisease)).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.getById(10);

            assertThat(result.getSeverityLevel()).isNull();
            assertThat(result.getCreatedByName()).isNull();
        }
    }

    // ── create ──────────────────────────────────────────────────

    @Nested
    class Create {

        private DiseaseRequest createRequest() {
            DiseaseRequest request = new DiseaseRequest();
            request.setDiseaseName("Distemper");
            request.setDescription("Canine distemper virus");
            request.setSeverityLevel("HIGH");
            request.setIsContagious(true);
            request.setIncubationPeriod("1-2 weeks");
            return request;
        }

        @Test
        void happyPath_createsDisease() {
            DiseaseRequest request = createRequest();

            when(userRepository.findById(1)).thenReturn(Optional.of(testUser));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(invocation -> {
                Disease d = invocation.getArgument(0);
                d.setDiseaseId(100);
                d.setCreatedAt(LocalDateTime.now());
                d.setUpdatedAt(LocalDateTime.now());
                return d;
            });
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.create(request, 1);

            assertThat(result.getDiseaseName()).isEqualTo("Distemper");
            assertThat(result.getSeverityLevel()).isEqualTo("HIGH");
            assertThat(result.getIsContagious()).isTrue();
            verify(diseaseRepository).save(any(Disease.class));
        }

        @Test
        void withNullIsContagious_defaultsToFalse() {
            DiseaseRequest request = createRequest();
            request.setIsContagious(null);

            when(userRepository.findById(1)).thenReturn(Optional.of(testUser));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(invocation -> {
                Disease d = invocation.getArgument(0);
                d.setDiseaseId(101);
                d.setCreatedAt(LocalDateTime.now());
                d.setUpdatedAt(LocalDateTime.now());
                return d;
            });
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.create(request, 1);

            assertThat(result.getIsContagious()).isFalse();
        }

        @Test
        void invalidSeverityLevel_throwsBadRequestException() {
            DiseaseRequest request = createRequest();
            request.setSeverityLevel("INVALID_LEVEL");

            when(userRepository.findById(1)).thenReturn(Optional.of(testUser));

            assertThatThrownBy(() -> diseaseService.create(request, 1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Mức độ nghiêm trọng không hợp lệ");
        }

        @Test
        void withSymptomMappings_savesMappingsCorrectly() {
            DiseaseRequest request = createRequest();
            DiseaseRequest.SymptomMappingItem symptomItem = new DiseaseRequest.SymptomMappingItem();
            symptomItem.setSymptomId(10);
            symptomItem.setWeight(0.75);
            symptomItem.setIsPrimary(true);
            request.setSymptomMappings(List.of(symptomItem));

            when(userRepository.findById(1)).thenReturn(Optional.of(testUser));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(invocation -> {
                Disease d = invocation.getArgument(0);
                d.setDiseaseId(102);
                d.setCreatedAt(LocalDateTime.now());
                d.setUpdatedAt(LocalDateTime.now());
                return d;
            });
            when(symptomRepository.findBySymptomIdIn(List.of(10))).thenReturn(List.of(testSymptom));
            when(mappingRepository.save(any(DiseaseSymptomMapping.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.create(request, 1);

            assertThat(result).isNotNull();
            verify(mappingRepository).save(any(DiseaseSymptomMapping.class));
        }

        @Test
        void userNotFound_createdByIsNull() {
            DiseaseRequest request = createRequest();

            when(userRepository.findById(999)).thenReturn(Optional.empty());
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(invocation -> {
                Disease d = invocation.getArgument(0);
                d.setDiseaseId(103);
                d.setCreatedAt(LocalDateTime.now());
                d.setUpdatedAt(LocalDateTime.now());
                return d;
            });
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.create(request, 999);

            assertThat(result.getCreatedByName()).isNull();
        }

        @Test
        void withMedicationAndFirstAidMappings_savesAll() {
            DiseaseRequest request = createRequest();

            DiseaseRequest.MedicationMappingItem medItem = new DiseaseRequest.MedicationMappingItem();
            medItem.setMedicationId(20);
            medItem.setPriority(1);
            request.setMedicationMappings(List.of(medItem));

            DiseaseRequest.FirstAidGuideMappingItem faItem = new DiseaseRequest.FirstAidGuideMappingItem();
            faItem.setGuideId(30);
            faItem.setPriority(1);
            request.setFirstAidGuideMappings(List.of(faItem));

            when(userRepository.findById(1)).thenReturn(Optional.of(testUser));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(invocation -> {
                Disease d = invocation.getArgument(0);
                d.setDiseaseId(104);
                d.setCreatedAt(LocalDateTime.now());
                d.setUpdatedAt(LocalDateTime.now());
                return d;
            });
            when(medicationRepository.findAllById(List.of(20))).thenReturn(List.of(testMedication));
            when(firstAidGuideRepository.findAllById(List.of(30))).thenReturn(List.of(testGuide));
            when(medicationMappingRepository.save(any(DiseaseMedicationMapping.class))).thenAnswer(inv -> inv.getArgument(0));
            when(firstAidMappingRepository.save(any(DiseaseFirstAidMapping.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.create(request, 1);

            assertThat(result).isNotNull();
            verify(medicationMappingRepository).save(any(DiseaseMedicationMapping.class));
            verify(firstAidMappingRepository).save(any(DiseaseFirstAidMapping.class));
        }
    }

    // ── update ──────────────────────────────────────────────────

    @Nested
    class Update {

        private DiseaseRequest createUpdateRequest() {
            DiseaseRequest request = new DiseaseRequest();
            request.setDiseaseName("Updated Parvo");
            request.setDescription("Updated description");
            request.setSeverityLevel("MEDIUM");
            request.setIsContagious(false);
            return request;
        }

        @Test
        void happyPath_updatesDraftDisease() {
            DiseaseRequest request = createUpdateRequest();

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.update(1, request);

            assertThat(result.getDiseaseName()).isEqualTo("Updated Parvo");
            assertThat(result.getSeverityLevel()).isEqualTo("MEDIUM");
            assertThat(result.getIsContagious()).isFalse();
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            DiseaseRequest request = createUpdateRequest();

            when(diseaseRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diseaseService.update(999, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Bệnh");
        }

        @Test
        void publishedDisease_throwsBadRequestException() {
            DiseaseRequest request = createUpdateRequest();

            when(diseaseRepository.findById(2)).thenReturn(Optional.of(publishedDisease));

            assertThatThrownBy(() -> diseaseService.update(2, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("xuất bản");
        }

        @Test
        void rejectedDisease_resetsStatusToDraft() {
            DiseaseRequest request = createUpdateRequest();

            when(diseaseRepository.findById(3)).thenReturn(Optional.of(rejectedDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.update(3, request);

            assertThat(result.getStatus()).isEqualTo("DRAFT");
        }

        @Test
        void invalidSeverityLevel_throwsBadRequestException() {
            DiseaseRequest request = createUpdateRequest();
            request.setSeverityLevel("SUPER_HIGH");

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));

            assertThatThrownBy(() -> diseaseService.update(1, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Mức độ nghiêm trọng không hợp lệ");
        }

        @Test
        void withSymptomMappings_deletesOldAndSavesNew() {
            DiseaseRequest request = createUpdateRequest();
            DiseaseRequest.SymptomMappingItem symptomItem = new DiseaseRequest.SymptomMappingItem();
            symptomItem.setSymptomId(10);
            symptomItem.setWeight(0.60);
            symptomItem.setIsPrimary(false);
            request.setSymptomMappings(List.of(symptomItem));

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));
            when(symptomRepository.findBySymptomIdIn(List.of(10))).thenReturn(List.of(testSymptom));
            when(mappingRepository.save(any(DiseaseSymptomMapping.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.update(1, request);

            assertThat(result).isNotNull();
            verify(mappingRepository).deleteByDiseaseDiseaseId(1);
            verify(mappingRepository).save(any(DiseaseSymptomMapping.class));
        }

        @Test
        void nullIsContagious_defaultsToFalse() {
            DiseaseRequest request = createUpdateRequest();
            request.setIsContagious(null);

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));
            when(mappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(medicationMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());
            when(firstAidMappingRepository.findByDisease(any())).thenReturn(Collections.emptyList());

            DiseaseResponse result = diseaseService.update(1, request);

            assertThat(result.getIsContagious()).isFalse();
        }
    }

    // ── delete ──────────────────────────────────────────────────

    @Nested
    class Delete {

        @Test
        void happyPath_softDeletesDraftDisease() {
            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));

            diseaseService.delete(1);

            assertThat(draftDisease.getIsDeleted()).isTrue();
            assertThat(draftDisease.getDeletedAt()).isNotNull();
            verify(diseaseRepository).save(draftDisease);
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(diseaseRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> diseaseService.delete(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Bệnh");
        }

        @Test
        void publishedDisease_throwsBadRequestException() {
            when(diseaseRepository.findById(2)).thenReturn(Optional.of(publishedDisease));

            assertThatThrownBy(() -> diseaseService.delete(2))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("xuất bản");
        }

        @Test
        void rejectedDisease_softDeletesSuccessfully() {
            when(diseaseRepository.findById(3)).thenReturn(Optional.of(rejectedDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));

            diseaseService.delete(3);

            assertThat(rejectedDisease.getIsDeleted()).isTrue();
            assertThat(rejectedDisease.getDeletedAt()).isNotNull();
        }

        @Test
        void softDelete_setsDeletedAtTimestamp() {
            LocalDateTime before = LocalDateTime.now();

            when(diseaseRepository.findById(1)).thenReturn(Optional.of(draftDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));

            diseaseService.delete(1);

            assertThat(draftDisease.getDeletedAt()).isAfterOrEqualTo(before);
        }

        @Test
        void approvedDisease_softDeletesSuccessfully() {
            Disease approvedDisease = Disease.builder()
                    .diseaseId(4)
                    .diseaseName("Leptospirosis")
                    .status(ContentStatus.APPROVED)
                    .isDeleted(false)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(diseaseRepository.findById(4)).thenReturn(Optional.of(approvedDisease));
            when(diseaseRepository.save(any(Disease.class))).thenAnswer(inv -> inv.getArgument(0));

            diseaseService.delete(4);

            assertThat(approvedDisease.getIsDeleted()).isTrue();
        }
    }
}
