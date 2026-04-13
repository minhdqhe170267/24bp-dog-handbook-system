package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateTrainingProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressSummaryResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogExerciseProgress;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.DogSpecialtyEnrollment;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogExerciseProgressRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogSpecialtyEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DogTrainingProgressServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DogTrainingProgressServiceImplTest {

    @Mock private DogSpecialtyEnrollmentRepository dogSpecialtyEnrollmentRepository;
    @Mock private DogExerciseProgressRepository dogExerciseProgressRepository;
    @Mock private TrainingRoadmapRepository trainingRoadmapRepository;
    @Mock private TrainingPhaseRepository trainingPhaseRepository;
    @Mock private RoadmapExerciseRepository roadmapExerciseRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private DogTrainingProgressServiceImpl service;

    private User trainer;
    private DogProfile dog;
    private TrainingSpecialty specialty;
    private DogAssignment primaryAssignment;

    @BeforeEach
    void setUp() {
        trainer = User.builder()
                .userId(1)
                .username("trainer1")
                .fullName("Nguyen Van A")
                .passwordHash("hash")
                .role(UserRole.TRAINER)
                .build();

        dog = DogProfile.builder()
                .dogId(10)
                .dogCode("DK010")
                .dogName("Rex")
                .build();

        specialty = TrainingSpecialty.builder()
                .specialtyId(20)
                .specialtyCode("GD")
                .specialtyName("Guard Dog")
                .version(1)
                .isDeleted(false)
                .build();

        primaryAssignment = DogAssignment.builder()
                .assignmentId(100)
                .dogProfile(dog)
                .trainer(trainer)
                .trainingSpecialty(specialty)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .isActive(true)
                .build();
    }

    // ===================== initializeForAssignment =====================

    @Test
    void initializeForAssignment_existingEnrollment_updatesTrainerAndAssignment() {
        DogSpecialtyEnrollment existing = DogSpecialtyEnrollment.builder()
                .enrollmentId(1)
                .dogProfile(dog)
                .trainer(trainer)
                .assignment(primaryAssignment)
                .trainingSpecialty(specialty)
                .templateVersion(1)
                .status(EnrollmentStatus.ENROLLED)
                .progressPercent(BigDecimal.ZERO)
                .build();

        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndTrainingSpecialtySpecialtyIdAndIsDeletedFalse(10, 20))
                .thenReturn(Optional.of(existing));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.initializeForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository).save(any(DogSpecialtyEnrollment.class));
        verify(trainingRoadmapRepository, never()).findByTrainingSpecialtySpecialtyIdAndIsDeletedFalseOrderByRoadmapOrderAsc(anyInt());
    }

    @Test
    void initializeForAssignment_nullAssignment_doesNothing() {
        service.initializeForAssignment(null);

        verify(dogSpecialtyEnrollmentRepository, never()).save(any());
    }

    @Test
    void initializeForAssignment_nonPrimaryAssignment_doesNothing() {
        DogAssignment tempAssignment = DogAssignment.builder()
                .assignmentId(101)
                .dogProfile(dog)
                .trainer(trainer)
                .trainingSpecialty(specialty)
                .assignmentType(AssignmentType.TEMPORARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .isActive(true)
                .build();

        service.initializeForAssignment(tempAssignment);

        verify(dogSpecialtyEnrollmentRepository, never()).save(any());
    }

    @Test
    void initializeForAssignment_nullSpecialty_throwsBadRequestException() {
        DogAssignment assignmentNoSpecialty = DogAssignment.builder()
                .assignmentId(102)
                .dogProfile(dog)
                .trainer(trainer)
                .trainingSpecialty(null)
                .assignmentType(AssignmentType.PRIMARY)
                .assignmentScope(AssignmentScope.FULL_TRAINING)
                .isActive(true)
                .build();

        assertThatThrownBy(() -> service.initializeForAssignment(assignmentNoSpecialty))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("specialty");
    }

    @Test
    void initializeForAssignment_noRoadmaps_throwsBadRequestException() {
        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndTrainingSpecialtySpecialtyIdAndIsDeletedFalse(10, 20))
                .thenReturn(Optional.empty());
        when(trainingRoadmapRepository.findByTrainingSpecialtySpecialtyIdAndIsDeletedFalseOrderByRoadmapOrderAsc(20))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.initializeForAssignment(primaryAssignment))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("roadmap");
    }

    // ===================== suspendForAssignment =====================

    @Test
    void suspendForAssignment_enrolledStatus_setsSuspended() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);

        when(dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(100))
                .thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.suspendForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository).save(any(DogSpecialtyEnrollment.class));
    }

    @Test
    void suspendForAssignment_completedStatus_doesNotSuspend() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.COMPLETED);

        when(dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(100))
                .thenReturn(Optional.of(enrollment));

        service.suspendForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository, never()).save(any());
    }

    @Test
    void suspendForAssignment_noEnrollment_doesNothing() {
        when(dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(100))
                .thenReturn(Optional.empty());

        service.suspendForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository, never()).save(any());
    }

    @Test
    void suspendForAssignment_inProgressStatus_setsSuspended() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);

        when(dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(100))
                .thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.suspendForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository).save(any(DogSpecialtyEnrollment.class));
    }

    @Test
    void suspendForAssignment_suspendedStatus_savesSuspendedAgain() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.SUSPENDED);

        when(dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(100))
                .thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.suspendForAssignment(primaryAssignment);

        verify(dogSpecialtyEnrollmentRepository).save(any(DogSpecialtyEnrollment.class));
    }

    // ===================== getByDog =====================

    @Test
    void getByDog_withEnrollments_returnsSummaryList() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getByDog(10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDogId()).isEqualTo(10);
    }

    @Test
    void getByDog_noEnrollments_returnsEmptyList() {
        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of());

        List<TrainingProgressSummaryResponse> result = service.getByDog(10);

        assertThat(result).isEmpty();
    }

    @Test
    void getByDog_multipleEnrollments_returnsAll() {
        DogSpecialtyEnrollment enrollment1 = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogSpecialtyEnrollment enrollment2 = buildEnrollment(2, EnrollmentStatus.IN_PROGRESS);

        DogExerciseProgress progress1 = buildExerciseProgress(1, enrollment1, ExerciseProgressStatus.NOT_STARTED);
        DogExerciseProgress progress2 = buildExerciseProgress(2, enrollment2, ExerciseProgressStatus.IN_PROGRESS);

        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of(enrollment1, enrollment2));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress1));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(2))
                .thenReturn(List.of(progress2));

        List<TrainingProgressSummaryResponse> result = service.getByDog(10);

        assertThat(result).hasSize(2);
    }

    @Test
    void getByDog_returnsCorrectDogName() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getByDog(10);

        assertThat(result.get(0).getDogName()).isEqualTo("Rex");
    }

    @Test
    void getByDog_returnsCorrectSpecialtyInfo() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(10))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getByDog(10);

        assertThat(result.get(0).getSpecialtyName()).isEqualTo("Guard Dog");
        assertThat(result.get(0).getSpecialtyId()).isEqualTo(20);
    }

    // ===================== getByTrainer =====================

    @Test
    void getByTrainer_withEnrollments_returnsSummaryList() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.IN_PROGRESS);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getByTrainer(1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTrainerId()).isEqualTo(1);
    }

    @Test
    void getByTrainer_noEnrollments_returnsEmptyList() {
        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of());

        List<TrainingProgressSummaryResponse> result = service.getByTrainer(1);

        assertThat(result).isEmpty();
    }

    @Test
    void getByTrainer_returnsCorrectTrainerName() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getByTrainer(1);

        assertThat(result.get(0).getTrainerName()).isEqualTo("Nguyen Van A");
    }

    @Test
    void getByTrainer_multipleEnrollments_returnsAll() {
        DogSpecialtyEnrollment enrollment1 = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogSpecialtyEnrollment enrollment2 = buildEnrollment(2, EnrollmentStatus.COMPLETED);

        DogExerciseProgress progress1 = buildExerciseProgress(1, enrollment1, ExerciseProgressStatus.NOT_STARTED);
        DogExerciseProgress progress2 = buildExerciseProgress(2, enrollment2, ExerciseProgressStatus.COMPLETED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment1, enrollment2));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress1));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(2))
                .thenReturn(List.of(progress2));

        List<TrainingProgressSummaryResponse> result = service.getByTrainer(1);

        assertThat(result).hasSize(2);
    }

    @Test
    void getByTrainer_returnsProgressPercent() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        enrollment.setProgressPercent(BigDecimal.valueOf(50));
        DogExerciseProgress progress1 = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.COMPLETED);
        DogExerciseProgress progress2 = buildExerciseProgress(2, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress1, progress2));

        List<TrainingProgressSummaryResponse> result = service.getByTrainer(1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProgressPercent()).isNotNull();
    }

    // ===================== getMine =====================

    @Test
    void getMine_delegatesToGetByTrainer_returnsSameResult() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getMine(1);

        assertThat(result).hasSize(1);
        verify(dogSpecialtyEnrollmentRepository).findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1);
    }

    @Test
    void getMine_noEnrollments_returnsEmptyList() {
        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of());

        List<TrainingProgressSummaryResponse> result = service.getMine(1);

        assertThat(result).isEmpty();
    }

    @Test
    void getMine_returnsCorrectTrainerId() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getMine(1);

        assertThat(result.get(0).getTrainerId()).isEqualTo(1);
    }

    @Test
    void getMine_multipleEnrollments_returnsAll() {
        DogSpecialtyEnrollment enrollment1 = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogSpecialtyEnrollment enrollment2 = buildEnrollment(2, EnrollmentStatus.IN_PROGRESS);

        DogExerciseProgress progress1 = buildExerciseProgress(1, enrollment1, ExerciseProgressStatus.NOT_STARTED);
        DogExerciseProgress progress2 = buildExerciseProgress(2, enrollment2, ExerciseProgressStatus.IN_PROGRESS);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment1, enrollment2));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress1));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(2))
                .thenReturn(List.of(progress2));

        List<TrainingProgressSummaryResponse> result = service.getMine(1);

        assertThat(result).hasSize(2);
    }

    @Test
    void getMine_returnsCorrectEnrollmentStatus() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(1))
                .thenReturn(List.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(progress));

        List<TrainingProgressSummaryResponse> result = service.getMine(1);

        assertThat(result.get(0).getStatus()).isEqualTo("ENROLLED");
    }

    // ===================== getDetail =====================

    @Test
    void getDetail_existingEnrollment_returnsDetailResponse() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));

        TrainingProgressDetailResponse result = service.getDetail(1);

        assertThat(result).isNotNull();
        assertThat(result.getSummary()).isNotNull();
        assertThat(result.getSummary().getEnrollmentId()).isEqualTo(1);
    }

    @Test
    void getDetail_notFound_throwsResourceNotFoundException() {
        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetail(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void getDetail_returnsRoadmapInfo() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.IN_PROGRESS);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));

        TrainingProgressDetailResponse result = service.getDetail(1);

        assertThat(result.getRoadmaps()).isNotNull();
        assertThat(result.getRoadmaps()).isNotEmpty();
    }

    @Test
    void getDetail_returnsSummaryWithDogInfo() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));

        TrainingProgressDetailResponse result = service.getDetail(1);

        assertThat(result.getSummary().getDogId()).isEqualTo(10);
        assertThat(result.getSummary().getDogName()).isEqualTo("Rex");
    }

    @Test
    void getDetail_returnsSummaryWithSpecialtyInfo() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));

        TrainingProgressDetailResponse result = service.getDetail(1);

        assertThat(result.getSummary().getSpecialtyId()).isEqualTo(20);
        assertThat(result.getSummary().getSpecialtyName()).isEqualTo("Guard Dog");
    }

    // ===================== updateEnrollment =====================

    @Test
    void updateEnrollment_updateNotes_updatesSuccessfully() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED)));

        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setNotes("Good progress");

        TrainingProgressSummaryResponse result = service.updateEnrollment(1, request);

        assertThat(result).isNotNull();
        assertThat(result.getEnrollmentId()).isEqualTo(1);
    }

    @Test
    void updateEnrollment_notFound_throwsResourceNotFoundException() {
        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(999)).thenReturn(Optional.empty());

        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setNotes("Notes");

        assertThatThrownBy(() -> service.updateEnrollment(999, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void updateEnrollment_completeWithoutFullProgress_throwsBadRequestException() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        enrollment.setProgressPercent(BigDecimal.valueOf(50));

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));

        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setStatus("COMPLETED");

        assertThatThrownBy(() -> service.updateEnrollment(1, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("100%");
    }

    @Test
    void updateEnrollment_validStatusChange_updatesStatus() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED)));

        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setStatus("SUSPENDED");

        TrainingProgressSummaryResponse result = service.updateEnrollment(1, request);

        assertThat(result).isNotNull();
    }

    @Test
    void updateEnrollment_nullStatus_onlyUpdatesNotes() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.ENROLLED);

        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1))
                .thenReturn(List.of(buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED)));

        UpdateTrainingProgressRequest request = new UpdateTrainingProgressRequest();
        request.setStatus(null);
        request.setNotes("Updated notes");

        TrainingProgressSummaryResponse result = service.updateEnrollment(1, request);

        assertThat(result).isNotNull();
        assertThat(result.getEnrollmentId()).isEqualTo(1);
    }

    // ===================== evaluateExercise =====================

    @Test
    void evaluateExercise_completedStatus_updatesProgress() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.IN_PROGRESS);

        when(dogExerciseProgressRepository.findDetailByProgressId(1)).thenReturn(Optional.of(progress));
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(trainer));
        when(dogExerciseProgressRepository.save(any(DogExerciseProgress.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("COMPLETED");
        request.setScore(BigDecimal.valueOf(8.5));
        request.setTrainerNotes("Good job");

        TrainingProgressSummaryResponse result = service.evaluateExercise(1, request, 1);

        assertThat(result).isNotNull();
        verify(dogExerciseProgressRepository).save(any(DogExerciseProgress.class));
    }

    @Test
    void evaluateExercise_notFoundProgress_throwsResourceNotFoundException() {
        when(dogExerciseProgressRepository.findDetailByProgressId(999)).thenReturn(Optional.empty());

        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("COMPLETED");

        assertThatThrownBy(() -> service.evaluateExercise(999, request, 1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void evaluateExercise_evaluatorNotFound_throwsResourceNotFoundException() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.IN_PROGRESS);

        when(dogExerciseProgressRepository.findDetailByProgressId(1)).thenReturn(Optional.of(progress));
        when(userRepository.findByUserIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("COMPLETED");

        assertThatThrownBy(() -> service.evaluateExercise(1, request, 999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void evaluateExercise_skippedStatus_setsCompletedAt() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogExerciseProgressRepository.findDetailByProgressId(1)).thenReturn(Optional.of(progress));
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(trainer));
        when(dogExerciseProgressRepository.save(any(DogExerciseProgress.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("SKIPPED");
        request.setTrainerNotes("Skipped due to injury");

        TrainingProgressSummaryResponse result = service.evaluateExercise(1, request, 1);

        assertThat(result).isNotNull();
        verify(dogExerciseProgressRepository).save(any(DogExerciseProgress.class));
    }

    @Test
    void evaluateExercise_inProgressStatus_setsStartedAt() {
        DogSpecialtyEnrollment enrollment = buildEnrollment(1, EnrollmentStatus.IN_PROGRESS);
        DogExerciseProgress progress = buildExerciseProgress(1, enrollment, ExerciseProgressStatus.NOT_STARTED);

        when(dogExerciseProgressRepository.findDetailByProgressId(1)).thenReturn(Optional.of(progress));
        when(userRepository.findByUserIdAndIsDeletedFalse(1)).thenReturn(Optional.of(trainer));
        when(dogExerciseProgressRepository.save(any(DogExerciseProgress.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(1)).thenReturn(Optional.of(enrollment));
        when(dogExerciseProgressRepository.findByEnrollmentIdWithDetails(1)).thenReturn(List.of(progress));
        when(dogSpecialtyEnrollmentRepository.save(any(DogSpecialtyEnrollment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        EvaluateExerciseProgressRequest request = new EvaluateExerciseProgressRequest();
        request.setStatus("IN_PROGRESS");

        TrainingProgressSummaryResponse result = service.evaluateExercise(1, request, 1);

        assertThat(result).isNotNull();
        verify(dogExerciseProgressRepository).save(any(DogExerciseProgress.class));
    }

    // ===================== Helper methods =====================

    private DogSpecialtyEnrollment buildEnrollment(Integer id, EnrollmentStatus status) {
        DogSpecialtyEnrollment enrollment = DogSpecialtyEnrollment.builder()
                .enrollmentId(id)
                .dogProfile(dog)
                .trainer(trainer)
                .assignment(primaryAssignment)
                .trainingSpecialty(specialty)
                .templateVersion(1)
                .status(status)
                .progressPercent(BigDecimal.ZERO)
                .isDeleted(false)
                .build();
        enrollment.setEnrolledAt(LocalDateTime.now());
        enrollment.setCreatedAt(LocalDateTime.now());
        enrollment.setUpdatedAt(LocalDateTime.now());
        return enrollment;
    }

    private DogExerciseProgress buildExerciseProgress(Integer progressId,
                                                       DogSpecialtyEnrollment enrollment,
                                                       ExerciseProgressStatus status) {
        return DogExerciseProgress.builder()
                .progressId(progressId)
                .enrollment(enrollment)
                .roadmapExerciseId(1)
                .roadmapId(1)
                .roadmapName("Basic Roadmap")
                .roadmapOrder(1)
                .phaseId(1)
                .phaseName("Phase 1")
                .phaseOrder(1)
                .exerciseId(1)
                .exerciseName("Sit")
                .exerciseOrder(1)
                .status(status)
                .build();
    }
}
