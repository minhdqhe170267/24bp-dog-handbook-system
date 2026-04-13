package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingExerciseResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingMethodResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingRoadmapResponse;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingSpecialtyRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.TrainingServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrainingServiceImplTest {

    @Mock private TrainingMethodRepository trainingMethodRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private TrainingRoadmapRepository trainingRoadmapRepository;
    @Mock private TrainingPhaseRepository trainingPhaseRepository;
    @Mock private RoadmapExerciseRepository roadmapExerciseRepository;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private UserRepository userRepository;
    @Mock private TrainingSpecialtyRepository trainingSpecialtyRepository;

    @InjectMocks
    private TrainingServiceImpl service;

    private User user;
    private TrainingSpecialty specialty;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .userId(1)
                .username("trainer1")
                .fullName("Nguyen Van A")
                .passwordHash("hash")
                .role(UserRole.CONTENT_EDITOR)
                .build();

        specialty = TrainingSpecialty.builder()
                .specialtyId(10)
                .specialtyCode("SP001")
                .specialtyName("Guard Dog")
                .version(1)
                .isDeleted(false)
                .build();
    }

    // ===================== getAllMethods =====================

    @Test
    void getAllMethods_noSearch_returnsPageOfMethods() {
        TrainingMethod method = buildMethod(1, "Positive Reinforcement", ContentStatus.DRAFT);
        Page<TrainingMethod> page = new PageImpl<>(List.of(method));
        when(trainingMethodRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingMethodResponse> result = service.getAllMethods(0, 10, null);

        assertThat(result.getContent()).hasSize(1);
        TrainingMethodResponse response = (TrainingMethodResponse) result.getContent().get(0);
        assertThat(response.getMethodName()).isEqualTo("Positive Reinforcement");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getAllMethods_withSearch_usesSearchRepository() {
        TrainingMethod method = buildMethod(1, "Clicker Training", ContentStatus.DRAFT);
        Page<TrainingMethod> page = new PageImpl<>(List.of(method));
        when(trainingMethodRepository.findByMethodNameContainingIgnoreCaseAndIsDeletedFalse(
                eq("Clicker"), any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingMethodResponse> result = service.getAllMethods(0, 10, "Clicker");

        assertThat(result.getContent()).hasSize(1);
        TrainingMethodResponse response = (TrainingMethodResponse) result.getContent().get(0);
        assertThat(response.getMethodName()).isEqualTo("Clicker Training");
    }

    @Test
    void getAllMethods_blankSearch_treatsAsNoSearch() {
        Page<TrainingMethod> page = new PageImpl<>(List.of());
        when(trainingMethodRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingMethodResponse> result = service.getAllMethods(0, 10, "   ");

        assertThat(result.getContent()).isEmpty();
        verify(trainingMethodRepository).findByIsDeletedFalse(any(Pageable.class));
    }

    @Test
    void getAllMethods_emptyResult_returnsEmptyContent() {
        Page<TrainingMethod> page = new PageImpl<>(List.of());
        when(trainingMethodRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingMethodResponse> result = service.getAllMethods(0, 10, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
        assertThat(result.getTotalPages()).isEqualTo(page.getTotalPages());
    }

    @Test
    void getAllMethods_negativePage_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getAllMethods(-1, 10, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("page");
    }

    // ===================== getMethodById =====================

    @Test
    void getMethodById_existingMethod_returnsResponse() {
        TrainingMethod method = buildMethod(1, "Lure Reward", ContentStatus.DRAFT);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(method));

        TrainingMethodResponse result = service.getMethodById(1);

        assertThat(result.getMethodId()).isEqualTo(1);
        assertThat(result.getMethodName()).isEqualTo("Lure Reward");
    }

    @Test
    void getMethodById_notFound_throwsResourceNotFoundException() {
        when(trainingMethodRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMethodById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getMethodById_deletedMethod_throwsResourceNotFoundException() {
        TrainingMethod method = buildMethod(1, "Deleted Method", ContentStatus.DRAFT);
        method.setIsDeleted(true);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(method));

        assertThatThrownBy(() -> service.getMethodById(1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("1");
    }

    @Test
    void getMethodById_nullId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getMethodById(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("id");
    }

    @Test
    void getMethodById_zeroId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getMethodById(0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("id");
    }

    // ===================== createMethod =====================

    @Test
    void createMethod_validRequest_returnsCreatedResponse() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("New Method");
        request.setDescription("Description");

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> {
            TrainingMethod saved = invocation.getArgument(0);
            saved.setMethodId(1);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingMethodResponse result = service.createMethod(request, 1);

        assertThat(result.getMethodId()).isEqualTo(1);
        assertThat(result.getMethodName()).isEqualTo("New Method");
        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void createMethod_userNotFound_throwsResourceNotFoundException() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Method");

        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createMethod(request, 999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void createMethod_blankName_throwsIllegalArgumentException() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("   ");

        assertThatThrownBy(() -> service.createMethod(request, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("methodName");
    }

    @Test
    void createMethod_nullName_throwsIllegalArgumentException() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName(null);

        assertThatThrownBy(() -> service.createMethod(request, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("methodName");
    }

    @Test
    void createMethod_setsStatusToDraft() {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Alpha Method");

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> {
            TrainingMethod saved = invocation.getArgument(0);
            saved.setMethodId(2);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingMethodResponse result = service.createMethod(request, 1);

        assertThat(result.getStatus()).isEqualTo("DRAFT");
        verify(trainingMethodRepository).save(any(TrainingMethod.class));
    }

    // ===================== updateMethod =====================

    @Test
    void updateMethod_draftMethod_updatesSuccessfully() {
        TrainingMethod existing = buildMethod(1, "Old Name", ContentStatus.DRAFT);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(existing));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> {
            TrainingMethod saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Updated Name");
        request.setDescription("Updated desc");

        TrainingMethodResponse result = service.updateMethod(1, request);

        assertThat(result.getMethodName()).isEqualTo("Updated Name");
    }

    @Test
    void updateMethod_publishedMethod_throwsBadRequestException() {
        TrainingMethod published = buildMethod(1, "Published", ContentStatus.PUBLISHED);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(published));

        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("New Name");

        assertThatThrownBy(() -> service.updateMethod(1, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuat ban");
    }

    @Test
    void updateMethod_rejectedMethod_resetsStatusToDraft() {
        TrainingMethod rejected = buildMethod(1, "Rejected", ContentStatus.REJECTED);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(rejected));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> {
            TrainingMethod saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Fixed Method");

        TrainingMethodResponse result = service.updateMethod(1, request);

        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void updateMethod_notFound_throwsResourceNotFoundException() {
        when(trainingMethodRepository.findById(999)).thenReturn(Optional.empty());

        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Any");

        assertThatThrownBy(() -> service.updateMethod(999, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void updateMethod_submittedMethod_updatesWithoutStatusChange() {
        TrainingMethod pending = buildMethod(1, "Pending", ContentStatus.PENDING);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(pending));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> {
            TrainingMethod saved = invocation.getArgument(0);
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName("Updated Pending");

        TrainingMethodResponse result = service.updateMethod(1, request);

        assertThat(result.getMethodName()).isEqualTo("Updated Pending");
        assertThat(result.getStatus()).isEqualTo("PENDING");
    }

    // ===================== deleteMethod =====================

    @Test
    void deleteMethod_draftMethod_softDeletes() {
        TrainingMethod method = buildMethod(1, "To Delete", ContentStatus.DRAFT);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(method));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.deleteMethod(1);

        verify(trainingMethodRepository).save(any(TrainingMethod.class));
    }

    @Test
    void deleteMethod_publishedMethod_throwsBadRequestException() {
        TrainingMethod published = buildMethod(1, "Published", ContentStatus.PUBLISHED);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(published));

        assertThatThrownBy(() -> service.deleteMethod(1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xuat ban");
    }

    @Test
    void deleteMethod_notFound_throwsResourceNotFoundException() {
        when(trainingMethodRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteMethod(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void deleteMethod_nullId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.deleteMethod(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteMethod_rejectedMethod_softDeletesSuccessfully() {
        TrainingMethod rejected = buildMethod(1, "Rejected", ContentStatus.REJECTED);
        when(trainingMethodRepository.findById(1)).thenReturn(Optional.of(rejected));
        when(trainingMethodRepository.save(any(TrainingMethod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.deleteMethod(1);

        verify(trainingMethodRepository).save(any(TrainingMethod.class));
    }

    // ===================== getAllExercises =====================

    @Test
    void getAllExercises_noFilters_returnsAll() {
        TrainingExercise exercise = buildExercise(1, "Sit", DifficultyLevel.BASIC, ContentStatus.DRAFT);
        Page<TrainingExercise> page = new PageImpl<>(List.of(exercise));
        when(trainingExerciseRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingExerciseResponse> result = service.getAllExercises(0, 10, null, null);

        assertThat(result.getContent()).hasSize(1);
        TrainingExerciseResponse response = (TrainingExerciseResponse) result.getContent().get(0);
        assertThat(response.getExerciseName()).isEqualTo("Sit");
    }

    @Test
    void getAllExercises_withSearch_filtersbyName() {
        TrainingExercise exercise = buildExercise(1, "Stay", DifficultyLevel.INTERMEDIATE, ContentStatus.DRAFT);
        Page<TrainingExercise> page = new PageImpl<>(List.of(exercise));
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(
                eq("Stay"), any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingExerciseResponse> result = service.getAllExercises(0, 10, "Stay", null);

        assertThat(result.getContent()).hasSize(1);
        TrainingExerciseResponse response = (TrainingExerciseResponse) result.getContent().get(0);
        assertThat(response.getExerciseName()).isEqualTo("Stay");
    }

    @Test
    void getAllExercises_withDifficulty_filtersByDifficulty() {
        TrainingExercise exercise = buildExercise(1, "Attack", DifficultyLevel.ADVANCED, ContentStatus.DRAFT);
        Page<TrainingExercise> page = new PageImpl<>(List.of(exercise));
        when(trainingExerciseRepository.findByDifficultyLevelAndIsDeletedFalse(
                eq(DifficultyLevel.ADVANCED), any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingExerciseResponse> result = service.getAllExercises(0, 10, null, "ADVANCED");

        assertThat(result.getContent()).hasSize(1);
        TrainingExerciseResponse response = (TrainingExerciseResponse) result.getContent().get(0);
        assertThat(response.getDifficultyLevel()).isEqualTo("ADVANCED");
    }

    @Test
    void getAllExercises_invalidDifficulty_throwsBadRequestException() {
        assertThatThrownBy(() -> service.getAllExercises(0, 10, null, "INVALID_LEVEL"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAllExercises_searchTakesPriorityOverDifficulty() {
        TrainingExercise exercise = buildExercise(1, "Heel", DifficultyLevel.BASIC, ContentStatus.DRAFT);
        Page<TrainingExercise> page = new PageImpl<>(List.of(exercise));
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(
                eq("Heel"), any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingExerciseResponse> result = service.getAllExercises(0, 10, "Heel", "ADVANCED");

        assertThat(result.getContent()).hasSize(1);
        verify(trainingExerciseRepository, never()).findByDifficultyLevelAndIsDeletedFalse(any(), any());
    }

    // ===================== getExerciseById =====================

    @Test
    void getExerciseById_existingExercise_returnsResponse() {
        TrainingExercise exercise = buildExercise(1, "Fetch", DifficultyLevel.BASIC, ContentStatus.DRAFT);
        when(trainingExerciseRepository.findById(1)).thenReturn(Optional.of(exercise));

        TrainingExerciseResponse result = service.getExerciseById(1);

        assertThat(result.getExerciseId()).isEqualTo(1);
        assertThat(result.getExerciseName()).isEqualTo("Fetch");
    }

    @Test
    void getExerciseById_notFound_throwsResourceNotFoundException() {
        when(trainingExerciseRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getExerciseById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getExerciseById_deletedExercise_throwsResourceNotFoundException() {
        TrainingExercise exercise = buildExercise(1, "Deleted", DifficultyLevel.BASIC, ContentStatus.DRAFT);
        exercise.setIsDeleted(true);
        when(trainingExerciseRepository.findById(1)).thenReturn(Optional.of(exercise));

        assertThatThrownBy(() -> service.getExerciseById(1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("1");
    }

    @Test
    void getExerciseById_nullId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getExerciseById(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getExerciseById_negativeId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getExerciseById(-5))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ===================== createExercise =====================

    @Test
    void createExercise_validRequest_returnsCreatedResponse() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("Sit Command");
        request.setDescription("Teach sit");
        request.setDifficultyLevel("BASIC");

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(trainingExerciseRepository.save(any(TrainingExercise.class))).thenAnswer(invocation -> {
            TrainingExercise saved = invocation.getArgument(0);
            saved.setExerciseId(1);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingExerciseResponse result = service.createExercise(request, 1);

        assertThat(result.getExerciseId()).isEqualTo(1);
        assertThat(result.getExerciseName()).isEqualTo("Sit Command");
        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void createExercise_invalidDifficulty_throwsBadRequestException() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("Exercise");
        request.setDifficultyLevel("SUPER_HARD");

        assertThatThrownBy(() -> service.createExercise(request, 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void createExercise_blankName_throwsIllegalArgumentException() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("");
        request.setDifficultyLevel("BASIC");

        assertThatThrownBy(() -> service.createExercise(request, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exerciseName");
    }

    @Test
    void createExercise_userNotFound_throwsResourceNotFoundException() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("Exercise");
        request.setDifficultyLevel("BASIC");

        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createExercise(request, 999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void createExercise_setsStatusToDraft() {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName("Roll Over");
        request.setDifficultyLevel("INTERMEDIATE");

        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(trainingExerciseRepository.save(any(TrainingExercise.class))).thenAnswer(invocation -> {
            TrainingExercise saved = invocation.getArgument(0);
            saved.setExerciseId(5);
            saved.setCreatedAt(LocalDateTime.now());
            saved.setUpdatedAt(LocalDateTime.now());
            return saved;
        });

        TrainingExerciseResponse result = service.createExercise(request, 1);

        assertThat(result.getStatus()).isEqualTo("DRAFT");
        assertThat(result.getDifficultyLevel()).isEqualTo("INTERMEDIATE");
    }

    // ===================== getAllRoadmaps =====================

    @Test
    void getAllRoadmaps_noSpecialtyFilter_returnsAll() {
        TrainingRoadmap roadmap = buildRoadmap(1, "Basic Obedience", ContentStatus.DRAFT);
        Page<TrainingRoadmap> page = new PageImpl<>(List.of(roadmap));
        when(trainingRoadmapRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);
        when(trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(1))
                .thenReturn(List.of());

        PageResponse<TrainingRoadmapResponse> result = service.getAllRoadmaps(0, 10, null);

        assertThat(result.getContent()).hasSize(1);
        TrainingRoadmapResponse response = (TrainingRoadmapResponse) result.getContent().get(0);
        assertThat(response.getRoadmapName()).isEqualTo("Basic Obedience");
    }

    @Test
    void getAllRoadmaps_withSpecialtyId_filtersBySpecialty() {
        TrainingRoadmap roadmap = buildRoadmap(1, "Guard Training", ContentStatus.DRAFT);
        Page<TrainingRoadmap> page = new PageImpl<>(List.of(roadmap));
        when(trainingRoadmapRepository.findByTrainingSpecialtySpecialtyIdAndIsDeletedFalse(
                eq(10), any(Pageable.class))).thenReturn(page);
        when(trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(1))
                .thenReturn(List.of());

        PageResponse<TrainingRoadmapResponse> result = service.getAllRoadmaps(0, 10, 10);

        assertThat(result.getContent()).hasSize(1);
        verify(trainingRoadmapRepository).findByTrainingSpecialtySpecialtyIdAndIsDeletedFalse(eq(10), any());
    }

    @Test
    void getAllRoadmaps_emptyResult_returnsEmptyContent() {
        Page<TrainingRoadmap> page = new PageImpl<>(List.of());
        when(trainingRoadmapRepository.findByIsDeletedFalse(any(Pageable.class))).thenReturn(page);

        PageResponse<TrainingRoadmapResponse> result = service.getAllRoadmaps(0, 10, null);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void getAllRoadmaps_negativePage_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getAllRoadmaps(-1, 10, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("page");
    }

    @Test
    void getAllRoadmaps_zeroSize_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getAllRoadmaps(0, 0, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("size");
    }

    // ===================== getRoadmapById =====================

    @Test
    void getRoadmapById_existingRoadmap_returnsDetailResponse() {
        TrainingRoadmap roadmap = buildRoadmap(1, "Detection Training", ContentStatus.DRAFT);
        when(trainingRoadmapRepository.findById(1)).thenReturn(Optional.of(roadmap));
        when(trainingPhaseRepository.findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(1))
                .thenReturn(List.of());
        when(roadmapExerciseRepository.findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(1))
                .thenReturn(List.of());

        TrainingRoadmapResponse result = service.getRoadmapById(1);

        assertThat(result.getRoadmapId()).isEqualTo(1);
        assertThat(result.getRoadmapName()).isEqualTo("Detection Training");
    }

    @Test
    void getRoadmapById_notFound_throwsResourceNotFoundException() {
        when(trainingRoadmapRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getRoadmapById(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getRoadmapById_deletedRoadmap_throwsResourceNotFoundException() {
        TrainingRoadmap roadmap = buildRoadmap(1, "Deleted Roadmap", ContentStatus.DRAFT);
        roadmap.setIsDeleted(true);
        when(trainingRoadmapRepository.findById(1)).thenReturn(Optional.of(roadmap));

        assertThatThrownBy(() -> service.getRoadmapById(1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("1");
    }

    @Test
    void getRoadmapById_nullId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getRoadmapById(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void getRoadmapById_zeroId_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.getRoadmapById(0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ===================== Helper methods =====================

    private TrainingMethod buildMethod(Integer id, String name, ContentStatus status) {
        TrainingMethod method = TrainingMethod.builder()
                .methodId(id)
                .methodName(name)
                .description("Description of " + name)
                .status(status)
                .createdBy(user)
                .isDeleted(false)
                .build();
        method.setCreatedAt(LocalDateTime.now());
        method.setUpdatedAt(LocalDateTime.now());
        return method;
    }

    private TrainingExercise buildExercise(Integer id, String name, DifficultyLevel difficulty, ContentStatus status) {
        TrainingExercise exercise = TrainingExercise.builder()
                .exerciseId(id)
                .exerciseName(name)
                .description("Description of " + name)
                .difficultyLevel(difficulty)
                .status(status)
                .createdBy(user)
                .isDeleted(false)
                .build();
        exercise.setCreatedAt(LocalDateTime.now());
        exercise.setUpdatedAt(LocalDateTime.now());
        return exercise;
    }

    private TrainingRoadmap buildRoadmap(Integer id, String name, ContentStatus status) {
        TrainingRoadmap roadmap = TrainingRoadmap.builder()
                .roadmapId(id)
                .roadmapName(name)
                .roadmapOrder(1)
                .trainingSpecialty(specialty)
                .description("Description of " + name)
                .status(status)
                .createdBy(user)
                .isDeleted(false)
                .build();
        roadmap.setCreatedAt(LocalDateTime.now());
        roadmap.setUpdatedAt(LocalDateTime.now());
        return roadmap;
    }
}
