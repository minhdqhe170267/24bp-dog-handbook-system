package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.EnrollDogRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateEnrollmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.EnrollmentResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ExerciseProgressResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PhaseProgressResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogExerciseProgress;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.DogTrainingEnrollment;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingPhase;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogExerciseProgressRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogTrainingEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DogTrainingEnrollmentService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DogTrainingEnrollmentServiceImpl implements DogTrainingEnrollmentService {

    private static final Set<ExerciseProgressStatus> DONE_STATUSES =
            EnumSet.of(ExerciseProgressStatus.COMPLETED, ExerciseProgressStatus.SKIPPED);

    private final DogTrainingEnrollmentRepository dogTrainingEnrollmentRepository;
    private final DogExerciseProgressRepository dogExerciseProgressRepository;
    private final DogProfileRepository dogProfileRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingPhaseRepository trainingPhaseRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final UserRepository userRepository;
    private final DogAssignmentRepository dogAssignmentRepository;

    @Override
    @Transactional
    public EnrollmentResponse enrollDog(EnrollDogRequest request) {
        DogProfile dog = getDog(request.getDogId());
        TrainingRoadmap roadmap = getRoadmap(request.getRoadmapId());
        User trainer = getTrainer(request.getAssignedTrainerId());

        if (roadmap.getStatus() != ContentStatus.PUBLISHED) {
            throw new BadRequestException("Chỉ có thể ghi danh với lộ trình đã xuất bản");
        }
        if (dogTrainingEnrollmentRepository.existsByDogProfileDogIdAndTrainingRoadmapRoadmapIdAndIsDeletedFalse(
                dog.getDogId(), roadmap.getRoadmapId())) {
            throw new BadRequestException("Chó đã được ghi danh vào lộ trình này");
        }
        if (!dogAssignmentRepository.existsByDogProfileDogIdAndTrainerUserIdAndIsActiveTrue(
                dog.getDogId(), trainer.getUserId())) {
            throw new BadRequestException("Huấn luyện viên chưa được phân công cho chó này");
        }

        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(roadmap.getRoadmapId());
        List<RoadmapExercise> roadmapExercises = roadmapExerciseRepository
                .findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(roadmap.getRoadmapId());
        if (phases.isEmpty() || roadmapExercises.isEmpty()) {
            throw new BadRequestException("Lộ trình phải có ít nhất 1 giai đoạn và 1 bài tập");
        }

        DogTrainingEnrollment enrollment = DogTrainingEnrollment.builder()
                .dogProfile(dog)
                .trainingRoadmap(roadmap)
                .assignedTrainer(trainer)
                .currentPhase(phases.get(0).getPhaseOrder())
                .status(EnrollmentStatus.ENROLLED)
                .notes(trimToNull(request.getNotes()))
                .isDeleted(false)
                .build();
        DogTrainingEnrollment savedEnrollment = dogTrainingEnrollmentRepository.save(enrollment);

        List<DogExerciseProgress> progresses = roadmapExercises.stream()
                .map(roadmapExercise -> DogExerciseProgress.builder()
                        .enrollment(savedEnrollment)
                        .roadmapExercise(roadmapExercise)
                        .status(ExerciseProgressStatus.NOT_STARTED)
                        .build())
                .toList();
        dogExerciseProgressRepository.saveAll(progresses);

        return toEnrollmentResponse(savedEnrollment, phases, progresses);
    }

    @Override
    public EnrollmentDetailResponse getEnrollmentDetail(Integer enrollmentId) {
        DogTrainingEnrollment enrollment = getEnrollment(enrollmentId);
        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(
                        enrollment.getTrainingRoadmap().getRoadmapId()
                );
        List<DogExerciseProgress> progresses = dogExerciseProgressRepository.findByEnrollmentIdWithDetails(enrollmentId);
        EnrollmentComputation computation = computeEnrollment(enrollment, phases, progresses);

        return EnrollmentDetailResponse.builder()
                .enrollmentId(enrollment.getEnrollmentId())
                .dogName(enrollment.getDogProfile().getDogName())
                .breedName(resolveBreedName(enrollment.getDogProfile().getDogBreed()))
                .roadmapName(enrollment.getTrainingRoadmap().getRoadmapName())
                .targetRole(enrollment.getTrainingRoadmap().getTargetRole())
                .currentPhase(computation.currentPhase())
                .totalPhases(computation.totalPhases())
                .progressPercent(computation.progressPercent())
                .status(enrollment.getStatus().name())
                .trainerName(enrollment.getAssignedTrainer().getFullName())
                .enrolledAt(enrollment.getEnrolledAt())
                .phases(computation.phaseResponses())
                .build();
    }

    @Override
    @Transactional
    public EnrollmentResponse evaluateExercise(Integer enrollmentId, EvaluateExerciseRequest request, Integer evaluatorId) {
        DogTrainingEnrollment enrollment = getEnrollment(enrollmentId);
        DogExerciseProgress progress = dogExerciseProgressRepository.findByEnrollmentIdAndExerciseId(
                        enrollmentId, request.getExerciseId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tiến độ bài tập", "exerciseId", request.getExerciseId()));
        User evaluator = getUser(evaluatorId);
        ExerciseProgressStatus status = parseExerciseStatus(request.getStatus());

        if (status == ExerciseProgressStatus.NOT_STARTED && request.getScore() != null) {
            throw new BadRequestException("Không thể chấm điểm cho bài tập chưa bắt đầu");
        }

        LocalDateTime now = LocalDateTime.now();
        progress.setStatus(status);
        progress.setScore(request.getScore());
        progress.setTrainerNotes(trimToNull(request.getTrainerNotes()));
        progress.setEvaluatedBy(evaluator);

        if (status == ExerciseProgressStatus.NOT_STARTED) {
            progress.setStartedAt(null);
            progress.setCompletedAt(null);
        } else if (status == ExerciseProgressStatus.IN_PROGRESS) {
            if (progress.getStartedAt() == null) {
                progress.setStartedAt(now);
            }
            progress.setCompletedAt(null);
        } else {
            if (progress.getStartedAt() == null) {
                progress.setStartedAt(now);
            }
            progress.setCompletedAt(now);
        }

        dogExerciseProgressRepository.save(progress);

        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(
                        enrollment.getTrainingRoadmap().getRoadmapId()
                );
        List<DogExerciseProgress> progresses = dogExerciseProgressRepository.findByEnrollmentIdWithDetails(enrollmentId);
        EnrollmentComputation computation = computeEnrollment(enrollment, phases, progresses);
        syncEnrollmentStatus(enrollment, computation);

        return toEnrollmentResponse(enrollment, phases, progresses);
    }

    @Override
    public List<EnrollmentResponse> getEnrollmentsByDog(Integer dogId) {
        getDog(dogId);
        return dogTrainingEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(dogId)
                .stream()
                .map(this::toEnrollmentSummary)
                .toList();
    }

    @Override
    public List<EnrollmentResponse> getEnrollmentsByTrainer(Integer trainerId) {
        getTrainer(trainerId);
        return dogTrainingEnrollmentRepository.findByAssignedTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(trainerId)
                .stream()
                .map(this::toEnrollmentSummary)
                .toList();
    }

    @Override
    public List<EnrollmentResponse> getMyEnrollments(Integer trainerId) {
        return getEnrollmentsByTrainer(trainerId);
    }

    @Override
    @Transactional
    public EnrollmentResponse updateEnrollment(Integer enrollmentId, UpdateEnrollmentRequest request) {
        DogTrainingEnrollment enrollment = getEnrollment(enrollmentId);
        if (request.getStatus() != null) {
            EnrollmentStatus targetStatus = parseEnrollmentStatus(request.getStatus());
            if (targetStatus == EnrollmentStatus.COMPLETED) {
                List<TrainingPhase> phases = trainingPhaseRepository
                        .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(
                                enrollment.getTrainingRoadmap().getRoadmapId()
                        );
                List<DogExerciseProgress> progresses = dogExerciseProgressRepository.findByEnrollmentIdWithDetails(enrollmentId);
                EnrollmentComputation computation = computeEnrollment(enrollment, phases, progresses);
                if (computation.progressPercent() < 100.0d) {
                    throw new BadRequestException("Không thể chuyển sang COMPLETED khi tiến độ chưa đủ 100%");
                }
                enrollment.setCompletedAt(LocalDateTime.now());
            } else if (targetStatus != EnrollmentStatus.COMPLETED) {
                enrollment.setCompletedAt(null);
            }
            enrollment.setStatus(targetStatus);
        }

        enrollment.setNotes(trimToNull(request.getNotes()));
        dogTrainingEnrollmentRepository.save(enrollment);
        return toEnrollmentSummary(enrollment);
    }

    @Override
    @Transactional
    public void deleteEnrollment(Integer enrollmentId) {
        DogTrainingEnrollment enrollment = getEnrollment(enrollmentId);
        enrollment.setIsDeleted(true);
        enrollment.setDeletedAt(LocalDateTime.now());
        dogTrainingEnrollmentRepository.save(enrollment);
    }

    @Override
    @Transactional
    public EnrollmentResponse restoreEnrollment(Integer enrollmentId) {
        DogTrainingEnrollment enrollment = dogTrainingEnrollmentRepository.findAnyByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi danh", "enrollmentId", enrollmentId));
        if (!Boolean.TRUE.equals(enrollment.getIsDeleted())) {
            throw new BadRequestException("Ghi danh này chưa bị xóa mềm");
        }
        if (dogTrainingEnrollmentRepository.existsByDogProfileDogIdAndTrainingRoadmapRoadmapIdAndIsDeletedFalse(
                enrollment.getDogProfile().getDogId(), enrollment.getTrainingRoadmap().getRoadmapId())) {
            throw new BadRequestException("Đã tồn tại ghi danh khác đang hoạt động cho chó và lộ trình này");
        }

        enrollment.setIsDeleted(false);
        enrollment.setDeletedAt(null);
        dogTrainingEnrollmentRepository.save(enrollment);
        return toEnrollmentSummary(enrollment);
    }

    private DogTrainingEnrollment getEnrollment(Integer enrollmentId) {
        if (enrollmentId == null || enrollmentId <= 0) {
            throw new IllegalArgumentException("enrollmentId must be greater than 0");
        }
        return dogTrainingEnrollmentRepository.findByEnrollmentIdAndIsDeletedFalse(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi danh", "enrollmentId", enrollmentId));
    }

    private DogProfile getDog(Integer dogId) {
        return dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId)
                .orElseThrow(() -> new ResourceNotFoundException("Chó", "dogId", dogId));
    }

    private TrainingRoadmap getRoadmap(Integer roadmapId) {
        return trainingRoadmapRepository.findByRoadmapIdAndIsDeletedFalse(roadmapId)
                .orElseThrow(() -> new ResourceNotFoundException("Lộ trình", "roadmapId", roadmapId));
    }

    private User getTrainer(Integer trainerId) {
        User trainer = getUser(trainerId);
        if (trainer.getRole() != UserRole.TRAINER) {
            throw new BadRequestException("assignedTrainerId phải là người dùng có vai trò TRAINER");
        }
        return trainer;
    }

    private User getUser(Integer userId) {
        return userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng", "userId", userId));
    }

    private EnrollmentStatus parseEnrollmentStatus(String value) {
        try {
            return EnrollmentStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Trạng thái ghi danh không hợp lệ");
        }
    }

    private ExerciseProgressStatus parseExerciseStatus(String value) {
        try {
            return ExerciseProgressStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Trạng thái bài tập không hợp lệ");
        }
    }

    private EnrollmentResponse toEnrollmentSummary(DogTrainingEnrollment enrollment) {
        List<TrainingPhase> phases = trainingPhaseRepository
                .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(
                        enrollment.getTrainingRoadmap().getRoadmapId()
                );
        List<DogExerciseProgress> progresses = dogExerciseProgressRepository
                .findByEnrollmentIdWithDetails(enrollment.getEnrollmentId());
        return toEnrollmentResponse(enrollment, phases, progresses);
    }

    private EnrollmentResponse toEnrollmentResponse(
            DogTrainingEnrollment enrollment,
            List<TrainingPhase> phases,
            List<DogExerciseProgress> progresses
    ) {
        EnrollmentComputation computation = computeEnrollment(enrollment, phases, progresses);
        return EnrollmentResponse.builder()
                .enrollmentId(enrollment.getEnrollmentId())
                .dogName(enrollment.getDogProfile().getDogName())
                .breedName(resolveBreedName(enrollment.getDogProfile().getDogBreed()))
                .roadmapName(enrollment.getTrainingRoadmap().getRoadmapName())
                .targetRole(enrollment.getTrainingRoadmap().getTargetRole())
                .currentPhase(computation.currentPhase())
                .totalPhases(computation.totalPhases())
                .progressPercent(computation.progressPercent())
                .status(enrollment.getStatus().name())
                .trainerName(enrollment.getAssignedTrainer().getFullName())
                .enrolledAt(enrollment.getEnrolledAt())
                .build();
    }

    private EnrollmentComputation computeEnrollment(
            DogTrainingEnrollment enrollment,
            List<TrainingPhase> phases,
            List<DogExerciseProgress> progresses
    ) {
        Map<Integer, List<DogExerciseProgress>> progressByPhase = progresses.stream()
                .collect(Collectors.groupingBy(
                        progress -> progress.getRoadmapExercise().getTrainingPhase().getPhaseId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        int totalExercises = progresses.size();
        int completedExercises = 0;
        Integer currentPhase = phases.isEmpty() ? 1 : phases.get(0).getPhaseOrder();
        boolean foundCurrentPhase = false;
        List<PhaseProgressResponse> phaseResponses = new ArrayList<>();

        for (TrainingPhase phase : phases) {
            List<DogExerciseProgress> phaseProgresses = progressByPhase.getOrDefault(phase.getPhaseId(), List.of());
            int completedInPhase = (int) phaseProgresses.stream()
                    .filter(progress -> DONE_STATUSES.contains(progress.getStatus()))
                    .count();
            completedExercises += completedInPhase;

            if (!foundCurrentPhase && phaseProgresses.stream().anyMatch(progress -> !DONE_STATUSES.contains(progress.getStatus()))) {
                currentPhase = phase.getPhaseOrder();
                foundCurrentPhase = true;
            }

            List<ExerciseProgressResponse> exerciseResponses = phaseProgresses.stream()
                    .map(progress -> ExerciseProgressResponse.builder()
                            .progressId(progress.getProgressId())
                            .exerciseId(progress.getRoadmapExercise().getTrainingExercise().getExerciseId())
                            .exerciseName(progress.getRoadmapExercise().getTrainingExercise().getExerciseName())
                            .status(progress.getStatus().name())
                            .score(progress.getScore())
                            .trainerNotes(progress.getTrainerNotes())
                            .completedAt(progress.getCompletedAt())
                            .build())
                    .toList();

            phaseResponses.add(PhaseProgressResponse.builder()
                    .phaseName(phase.getPhaseName())
                    .phaseOrder(phase.getPhaseOrder())
                    .totalExercises(phaseProgresses.size())
                    .completedExercises(completedInPhase)
                    .exercises(exerciseResponses)
                    .build());
        }

        if (!foundCurrentPhase && !phases.isEmpty()) {
            currentPhase = phases.get(phases.size() - 1).getPhaseOrder();
        }

        double progressPercent = totalExercises == 0
                ? 0.0d
                : roundPercentage((completedExercises * 100.0d) / totalExercises);

        return new EnrollmentComputation(progressPercent, currentPhase, phases.size(), phaseResponses);
    }

    private void syncEnrollmentStatus(DogTrainingEnrollment enrollment, EnrollmentComputation computation) {
        enrollment.setCurrentPhase(computation.currentPhase());
        if (computation.progressPercent() >= 100.0d) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            if (enrollment.getCompletedAt() == null) {
                enrollment.setCompletedAt(LocalDateTime.now());
            }
        } else if (enrollment.getStatus() == EnrollmentStatus.ENROLLED) {
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setCompletedAt(null);
        } else if (enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setCompletedAt(null);
        }
        dogTrainingEnrollmentRepository.save(enrollment);
    }

    private double roundPercentage(double value) {
        return Math.round(value * 100.0d) / 100.0d;
    }

    private String resolveBreedName(DogBreed breed) {
        return breed == null ? null : breed.getBreedName();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record EnrollmentComputation(
            double progressPercent,
            Integer currentPhase,
            Integer totalPhases,
            List<PhaseProgressResponse> phaseResponses
    ) {
    }
}
