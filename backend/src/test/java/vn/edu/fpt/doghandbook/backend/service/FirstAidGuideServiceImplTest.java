package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.FirstAidGuideResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.FirstAidGuideServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirstAidGuideServiceImplTest {

    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private UserRepository userRepository;
    @Mock private CloudinaryService cloudinaryService;

    @InjectMocks
    private FirstAidGuideServiceImpl service;

    private User editor;

    @BeforeEach
    void setUp() {
        editor = User.builder()
                .userId(1)
                .username("editor")
                .fullName("Editor")
                .passwordHash("hash")
                .role(UserRole.CONTENT_EDITOR)
                .build();
    }

    @Test
    void getAll_withSearchAndStatus_returnsMappedPage() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(1)
                .guideTitle("Heatstroke")
                .emergencyType("Environment")
                .immediateSteps("Cool the dog")
                .status(ContentStatus.PUBLISHED)
                .createdBy(editor)
                .build();

        when(firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
                "Heat",
                ContentStatus.PUBLISHED,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))))
                .thenReturn(new PageImpl<>(List.of(guide), PageRequest.of(0, 10), 1));

        PageResponse<FirstAidGuideResponse> response = service.getAll(0, 10, "Heat", "PUBLISHED");

        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getContent()).hasSize(1);
        FirstAidGuideResponse item = (FirstAidGuideResponse) response.getContent().get(0);
        assertThat(item.getGuideTitle()).isEqualTo("Heatstroke");
        assertThat(item.getStatus()).isEqualTo("PUBLISHED");
        assertThat(item.getCreatedByName()).isEqualTo("Editor");
    }

    @Test
    void getAll_invalidStatus_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAll(0, 10, null, "UNKNOWN"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid first-aid status");
    }

    @Test
    void getById_existingGuide_returnsResponse() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(3)
                .guideTitle("Poisoning")
                .emergencyType("Toxic")
                .description("Guide description")
                .immediateSteps("Call the vet")
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .build();

        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(3)).thenReturn(Optional.of(guide));

        FirstAidGuideResponse response = service.getById(3);

        assertThat(response.getGuideId()).isEqualTo(3);
        assertThat(response.getGuideTitle()).isEqualTo("Poisoning");
        assertThat(response.getDescription()).isEqualTo("Guide description");
        assertThat(response.getCreatedByName()).isEqualTo("Editor");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void create_duplicateTitle_throwsConflictException() {
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle("Heatstroke");
        request.setEmergencyType("Environment");
        request.setImmediateSteps("Step 1");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse("Heatstroke")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request, 1, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same title");
    }

    @Test
    void create_withPublishedStatusStillStartsAsDraft() {
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle("Poisoning");
        request.setEmergencyType("Toxic");
        request.setImmediateSteps("Step 1");
        request.setStatus("PUBLISHED");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse("Poisoning")).thenReturn(false);
        when(firstAidGuideRepository.save(any(FirstAidGuide.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FirstAidGuideResponse response = service.create(request, 1, null);

        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void create_validRequest_trimsFieldsAndReturnsSavedGuide() {
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle("  Wound Care  ");
        request.setEmergencyType("  Injury ");
        request.setImmediateSteps(" Clean wound ");
        request.setDescription("  Basic guide ");
        request.setRequiredMaterials(" Gauze ");
        request.setDoNotActions(" Do not use alcohol ");
        request.setWhenToSeekVet(" If bleeding continues ");

        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse("Wound Care")).thenReturn(false);
        when(firstAidGuideRepository.save(any(FirstAidGuide.class))).thenAnswer(invocation -> {
            FirstAidGuide saved = invocation.getArgument(0);
            saved.setGuideId(8);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 7, 9, 0));
            return saved;
        });

        FirstAidGuideResponse response = service.create(request, 1, null);

        assertThat(response.getGuideId()).isEqualTo(8);
        assertThat(response.getGuideTitle()).isEqualTo("Wound Care");
        assertThat(response.getEmergencyType()).isEqualTo("Injury");
        assertThat(response.getDescription()).isEqualTo("Basic guide");
        assertThat(response.getCreatedByName()).isEqualTo("Editor");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void update_rejectedGuide_resetsStatusToDraft() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(9)
                .guideTitle("Old title")
                .emergencyType("Old type")
                .immediateSteps("Old steps")
                .status(ContentStatus.REJECTED)
                .createdBy(editor)
                .isDeleted(false)
                .build();

        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle("New title");
        request.setEmergencyType("New type");
        request.setImmediateSteps("New steps");

        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(9)).thenReturn(Optional.of(guide));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndGuideIdNotAndIsDeletedFalse("New title", 9))
                .thenReturn(false);
        when(firstAidGuideRepository.save(any(FirstAidGuide.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FirstAidGuideResponse response = service.update(9, request, 1, null);

        assertThat(response.getGuideTitle()).isEqualTo("New title");
        assertThat(response.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void update_duplicateTitle_throwsConflictException() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(10)
                .guideTitle("Existing")
                .emergencyType("Type")
                .immediateSteps("Steps")
                .status(ContentStatus.DRAFT)
                .isDeleted(false)
                .build();
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle("Duplicate");
        request.setEmergencyType("Type");
        request.setImmediateSteps("Steps");

        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(10)).thenReturn(Optional.of(guide));
        when(userRepository.findById(1)).thenReturn(Optional.of(editor));
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndGuideIdNotAndIsDeletedFalse("Duplicate", 10))
                .thenReturn(true);

        assertThatThrownBy(() -> service.update(10, request, 1, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("same title");
    }

    @Test
    void delete_publishedGuide_throwsBadRequestException() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(6)
                .guideTitle("Fracture")
                .emergencyType("Injury")
                .immediateSteps("Step 1")
                .status(ContentStatus.PUBLISHED)
                .isDeleted(false)
                .build();

        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(6)).thenReturn(Optional.of(guide));

        assertThatThrownBy(() -> service.delete(6))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuất bản");
    }

    @Test
    void delete_draftGuide_softDeletesGuide() {
        FirstAidGuide guide = FirstAidGuide.builder()
                .guideId(7)
                .guideTitle("Fracture")
                .emergencyType("Injury")
                .immediateSteps("Step 1")
                .status(ContentStatus.DRAFT)
                .isDeleted(false)
                .build();

        when(firstAidGuideRepository.findByGuideIdAndIsDeletedFalse(7)).thenReturn(Optional.of(guide));
        when(firstAidGuideRepository.save(any(FirstAidGuide.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(7);

        assertThat(guide.getIsDeleted()).isTrue();
        assertThat(guide.getDeletedAt()).isNotNull();
        verify(firstAidGuideRepository).save(guide);
    }
}
