package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.SymptomRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.SymptomCategory;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseSymptomMappingRepository;
import vn.edu.fpt.doghandbook.backend.repository.SymptomRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.SymptomServiceImpl;

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
class SymptomServiceImplTest {

    @Mock private SymptomRepository symptomRepository;
    @Mock private DiseaseSymptomMappingRepository diseaseSymptomMappingRepository;

    @InjectMocks
    private SymptomServiceImpl symptomService;

    private Symptom symptom1;
    private Symptom symptom2;
    private Symptom symptomRespiratory;

    @BeforeEach
    void setUp() {
        symptom1 = Symptom.builder()
                .symptomId(1)
                .symptomCode("SYM001")
                .symptomName("Vomiting")
                .category(SymptomCategory.EATING)
                .severityIndicator(3)
                .description("Frequent vomiting")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        symptom2 = Symptom.builder()
                .symptomId(2)
                .symptomCode("SYM002")
                .symptomName("Diarrhea")
                .category(SymptomCategory.EATING)
                .severityIndicator(2)
                .description("Loose stool")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        symptomRespiratory = Symptom.builder()
                .symptomId(3)
                .symptomCode("SYM003")
                .symptomName("Coughing")
                .category(SymptomCategory.RESPIRATORY)
                .severityIndicator(4)
                .description("Persistent cough")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ── getAll ──────────────────────────────────────────────────

    @Nested
    class GetAll {

        @Test
        void happyPath_returnsAllSymptoms() {
            when(symptomRepository.findAll()).thenReturn(List.of(symptom1, symptom2, symptomRespiratory));

            List<SymptomResponse> result = symptomService.getAll();

            assertThat(result).hasSize(3);
            assertThat(result).extracting(SymptomResponse::getSymptomCode)
                    .containsExactly("SYM001", "SYM002", "SYM003");
        }

        @Test
        void emptyRepository_returnsEmptyList() {
            when(symptomRepository.findAll()).thenReturn(Collections.emptyList());

            List<SymptomResponse> result = symptomService.getAll();

            assertThat(result).isEmpty();
        }

        @Test
        void singleSymptom_returnsSingleElement() {
            when(symptomRepository.findAll()).thenReturn(List.of(symptom1));

            List<SymptomResponse> result = symptomService.getAll();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSymptomName()).isEqualTo("Vomiting");
        }

        @Test
        void responseMapsAllFieldsCorrectly() {
            when(symptomRepository.findAll()).thenReturn(List.of(symptom1));

            List<SymptomResponse> result = symptomService.getAll();

            SymptomResponse response = result.get(0);
            assertThat(response.getSymptomId()).isEqualTo(1);
            assertThat(response.getSymptomCode()).isEqualTo("SYM001");
            assertThat(response.getSymptomName()).isEqualTo("Vomiting");
            assertThat(response.getCategory()).isEqualTo("EATING");
            assertThat(response.getSeverityIndicator()).isEqualTo(3);
            assertThat(response.getDescription()).isEqualTo("Frequent vomiting");
            assertThat(response.getCreatedAt()).isNotNull();
            assertThat(response.getUpdatedAt()).isNotNull();
        }

        @Test
        void symptomWithNullCategory_returnsNullCategoryString() {
            Symptom noCategory = Symptom.builder()
                    .symptomId(99)
                    .symptomCode("SYM099")
                    .symptomName("Unknown")
                    .category(null)
                    .severityIndicator(1)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(symptomRepository.findAll()).thenReturn(List.of(noCategory));

            List<SymptomResponse> result = symptomService.getAll();

            assertThat(result.get(0).getCategory()).isNull();
        }
    }

    // ── getByCategory ───────────────────────────────────────────

    @Nested
    class GetByCategory {

        @Test
        void happyPath_returnsFilteredSymptoms() {
            when(symptomRepository.findByCategory(SymptomCategory.EATING))
                    .thenReturn(List.of(symptom1, symptom2));

            List<SymptomResponse> result = symptomService.getByCategory("EATING");

            assertThat(result).hasSize(2);
            assertThat(result).extracting(SymptomResponse::getCategory)
                    .containsOnly("EATING");
        }

        @Test
        void caseInsensitive_lowercaseInput_works() {
            when(symptomRepository.findByCategory(SymptomCategory.RESPIRATORY))
                    .thenReturn(List.of(symptomRespiratory));

            List<SymptomResponse> result = symptomService.getByCategory("respiratory");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSymptomName()).isEqualTo("Coughing");
        }

        @Test
        void invalidCategory_throwsBadRequestException() {
            assertThatThrownBy(() -> symptomService.getByCategory("NONEXISTENT"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Danh mục triệu chứng không hợp lệ");
        }

        @Test
        void emptyResultForValidCategory_returnsEmptyList() {
            when(symptomRepository.findByCategory(SymptomCategory.SKIN))
                    .thenReturn(Collections.emptyList());

            List<SymptomResponse> result = symptomService.getByCategory("SKIN");

            assertThat(result).isEmpty();
        }

        @Test
        void mixedCaseInput_parsesCorrectly() {
            when(symptomRepository.findByCategory(SymptomCategory.BEHAVIOR))
                    .thenReturn(Collections.emptyList());

            List<SymptomResponse> result = symptomService.getByCategory("Behavior");

            assertThat(result).isEmpty();
        }
    }

    // ── getById ─────────────────────────────────────────────────

    @Nested
    class GetById {

        @Test
        void happyPath_returnsSymptomResponse() {
            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));

            SymptomResponse result = symptomService.getById(1);

            assertThat(result.getSymptomId()).isEqualTo(1);
            assertThat(result.getSymptomCode()).isEqualTo("SYM001");
            assertThat(result.getSymptomName()).isEqualTo("Vomiting");
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(symptomRepository.findBySymptomId(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> symptomService.getById(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy triệu chứng");
        }

        @Test
        void returnsCorrectCategoryString() {
            when(symptomRepository.findBySymptomId(3)).thenReturn(Optional.of(symptomRespiratory));

            SymptomResponse result = symptomService.getById(3);

            assertThat(result.getCategory()).isEqualTo("RESPIRATORY");
        }

        @Test
        void returnsCorrectSeverityIndicator() {
            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));

            SymptomResponse result = symptomService.getById(1);

            assertThat(result.getSeverityIndicator()).isEqualTo(3);
        }

        @Test
        void idOfZero_delegatesToRepository() {
            when(symptomRepository.findBySymptomId(0)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> symptomService.getById(0))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ── create ──────────────────────────────────────────────────

    @Nested
    class Create {

        private SymptomRequest createRequest(String code, String name, String category) {
            SymptomRequest request = new SymptomRequest();
            request.setSymptomCode(code);
            request.setSymptomName(name);
            request.setCategory(category);
            request.setSeverityIndicator(2);
            request.setDescription("Test description");
            return request;
        }

        @Test
        void happyPath_createsAndReturnsSymptom() {
            SymptomRequest request = createRequest("SYM100", "Lethargy", "BEHAVIOR");

            when(symptomRepository.existsBySymptomCode("SYM100")).thenReturn(false);
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(invocation -> {
                Symptom s = invocation.getArgument(0);
                s.setSymptomId(100);
                s.setCreatedAt(LocalDateTime.now());
                s.setUpdatedAt(LocalDateTime.now());
                return s;
            });

            SymptomResponse result = symptomService.create(request);

            assertThat(result.getSymptomCode()).isEqualTo("SYM100");
            assertThat(result.getSymptomName()).isEqualTo("Lethargy");
            assertThat(result.getCategory()).isEqualTo("BEHAVIOR");
            assertThat(result.getSeverityIndicator()).isEqualTo(2);
            verify(symptomRepository).save(any(Symptom.class));
        }

        @Test
        void duplicateCode_throwsBadRequestException() {
            SymptomRequest request = createRequest("SYM001", "Duplicate", "EATING");

            when(symptomRepository.existsBySymptomCode("SYM001")).thenReturn(true);

            assertThatThrownBy(() -> symptomService.create(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Mã triệu chứng đã tồn tại");
        }

        @Test
        void invalidCategory_throwsBadRequestException() {
            SymptomRequest request = createRequest("SYM200", "Test", "INVALID_CAT");

            when(symptomRepository.existsBySymptomCode("SYM200")).thenReturn(false);

            assertThatThrownBy(() -> symptomService.create(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Danh mục triệu chứng không hợp lệ");
        }

        @Test
        void nullSeverityIndicator_defaultsToOne() {
            SymptomRequest request = createRequest("SYM300", "Mild symptom", "PHYSICAL");
            request.setSeverityIndicator(null);

            when(symptomRepository.existsBySymptomCode("SYM300")).thenReturn(false);
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(invocation -> {
                Symptom s = invocation.getArgument(0);
                s.setSymptomId(300);
                s.setCreatedAt(LocalDateTime.now());
                s.setUpdatedAt(LocalDateTime.now());
                return s;
            });

            SymptomResponse result = symptomService.create(request);

            assertThat(result.getSeverityIndicator()).isEqualTo(1);
        }

        @Test
        void nullDescription_savedAsNull() {
            SymptomRequest request = createRequest("SYM400", "No Desc", "SKIN");
            request.setDescription(null);

            when(symptomRepository.existsBySymptomCode("SYM400")).thenReturn(false);
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(invocation -> {
                Symptom s = invocation.getArgument(0);
                s.setSymptomId(400);
                s.setCreatedAt(LocalDateTime.now());
                s.setUpdatedAt(LocalDateTime.now());
                return s;
            });

            SymptomResponse result = symptomService.create(request);

            assertThat(result.getDescription()).isNull();
        }

        @Test
        void codeWithWhitespace_isTrimmed() {
            SymptomRequest request = createRequest("  SYM500  ", "Trimmed", "OTHER");

            when(symptomRepository.existsBySymptomCode("SYM500")).thenReturn(false);
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(invocation -> {
                Symptom s = invocation.getArgument(0);
                s.setSymptomId(500);
                s.setCreatedAt(LocalDateTime.now());
                s.setUpdatedAt(LocalDateTime.now());
                return s;
            });

            SymptomResponse result = symptomService.create(request);

            assertThat(result.getSymptomCode()).isEqualTo("SYM500");
        }
    }

    // ── update ──────────────────────────────────────────────────

    @Nested
    class Update {

        private SymptomRequest createUpdateRequest(String code, String name, String category) {
            SymptomRequest request = new SymptomRequest();
            request.setSymptomCode(code);
            request.setSymptomName(name);
            request.setCategory(category);
            request.setSeverityIndicator(4);
            request.setDescription("Updated description");
            return request;
        }

        @Test
        void happyPath_sameCode_updatesSuccessfully() {
            SymptomRequest request = createUpdateRequest("SYM001", "Updated Vomiting", "EATING");

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(inv -> inv.getArgument(0));

            SymptomResponse result = symptomService.update(1, request);

            assertThat(result.getSymptomName()).isEqualTo("Updated Vomiting");
            assertThat(result.getSeverityIndicator()).isEqualTo(4);
            assertThat(result.getDescription()).isEqualTo("Updated description");
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            SymptomRequest request = createUpdateRequest("SYM999", "Ghost", "EATING");

            when(symptomRepository.findBySymptomId(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> symptomService.update(999, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy triệu chứng");
        }

        @Test
        void changedCodeAlreadyExists_throwsBadRequestException() {
            SymptomRequest request = createUpdateRequest("SYM002", "Name Change", "EATING");

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(symptomRepository.existsBySymptomCode("SYM002")).thenReturn(true);

            assertThatThrownBy(() -> symptomService.update(1, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Mã triệu chứng đã tồn tại");
        }

        @Test
        void changedCodeToNewUniqueCode_updatesSuccessfully() {
            SymptomRequest request = createUpdateRequest("SYM_NEW", "New Code Symptom", "RESPIRATORY");

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(symptomRepository.existsBySymptomCode("SYM_NEW")).thenReturn(false);
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(inv -> inv.getArgument(0));

            SymptomResponse result = symptomService.update(1, request);

            assertThat(result.getSymptomCode()).isEqualTo("SYM_NEW");
            assertThat(result.getCategory()).isEqualTo("RESPIRATORY");
        }

        @Test
        void invalidCategory_throwsBadRequestException() {
            SymptomRequest request = createUpdateRequest("SYM001", "Same", "WRONG_CATEGORY");

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));

            assertThatThrownBy(() -> symptomService.update(1, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Danh mục triệu chứng không hợp lệ");
        }

        @Test
        void nullSeverityIndicator_defaultsToOne() {
            SymptomRequest request = createUpdateRequest("SYM001", "No Severity", "EATING");
            request.setSeverityIndicator(null);

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(symptomRepository.save(any(Symptom.class))).thenAnswer(inv -> inv.getArgument(0));

            SymptomResponse result = symptomService.update(1, request);

            assertThat(result.getSeverityIndicator()).isEqualTo(1);
        }
    }

    // ── delete ──────────────────────────────────────────────────

    @Nested
    class Delete {

        @Test
        void happyPath_noMappings_deletesSuccessfully() {
            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(Collections.emptyList());

            symptomService.delete(1);

            verify(symptomRepository).delete(symptom1);
        }

        @Test
        void notFound_throwsResourceNotFoundException() {
            when(symptomRepository.findBySymptomId(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> symptomService.delete(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Không tìm thấy triệu chứng");
        }

        @Test
        void hasDiseaseMappings_throwsBadRequestException() {
            DiseaseSymptomMapping mapping = DiseaseSymptomMapping.builder()
                    .mappingId(1)
                    .symptom(symptom1)
                    .build();

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(List.of(mapping));

            assertThatThrownBy(() -> symptomService.delete(1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Không thể xóa triệu chứng đang được liên kết");
        }

        @Test
        void multipleMappings_throwsBadRequestException() {
            DiseaseSymptomMapping mapping1 = DiseaseSymptomMapping.builder().mappingId(1).symptom(symptom1).build();
            DiseaseSymptomMapping mapping2 = DiseaseSymptomMapping.builder().mappingId(2).symptom(symptom1).build();

            when(symptomRepository.findBySymptomId(1)).thenReturn(Optional.of(symptom1));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(1)))
                    .thenReturn(List.of(mapping1, mapping2));

            assertThatThrownBy(() -> symptomService.delete(1))
                    .isInstanceOf(BadRequestException.class);

            verify(symptomRepository, never()).delete(any());
        }

        @Test
        void hardDelete_verifyRepositoryDeleteCalled() {
            when(symptomRepository.findBySymptomId(2)).thenReturn(Optional.of(symptom2));
            when(diseaseSymptomMappingRepository.findBySymptomSymptomIdIn(List.of(2)))
                    .thenReturn(Collections.emptyList());

            symptomService.delete(2);

            verify(symptomRepository).delete(symptom2);
        }
    }
}
