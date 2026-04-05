package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.EvaluateExerciseProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.UpdateTrainingProgressRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ExerciseProgressResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PhaseProgressResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.RoadmapProgressResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainingProgressSummaryResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogExerciseProgress;
import vn.edu.fpt.doghandbook.backend.entity.DogSpecialtyEnrollment;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;
import vn.edu.fpt.doghandbook.backend.entity.TrainingPhase;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogExerciseProgressRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogSpecialtyEnrollmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.RoadmapExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingPhaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingRoadmapRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DogTrainingProgressService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class DogTrainingProgressServiceImpl implements DogTrainingProgressService {

    private static final Set<ExerciseProgressStatus> DONE_STATUSES =
            EnumSet.of(ExerciseProgressStatus.COMPLETED, ExerciseProgressStatus.SKIPPED);

    private final DogSpecialtyEnrollmentRepository dogSpecialtyEnrollmentRepository;
    private final DogExerciseProgressRepository dogExerciseProgressRepository;
    private final TrainingRoadmapRepository trainingRoadmapRepository;
    private final TrainingPhaseRepository trainingPhaseRepository;
    private final RoadmapExerciseRepository roadmapExerciseRepository;
    private final UserRepository userRepository;

    @Override
    public void initializeForAssignment(DogAssignment assignment) {
        if (!isPrimaryTrainingAssignment(assignment)) {
            return;
        }
        TrainingSpecialty specialty = assignment.getTrainingSpecialty();
        if (specialty == null) {
            throw new BadRequestException("Assignment must resolve specialty");
        }

        DogSpecialtyEnrollment existing = dogSpecialtyEnrollmentRepository
                .findByDogProfileDogIdAndTrainingSpecialtySpecialtyIdAndIsDeletedFalse(
                        assignment.getDogProfile().getDogId(),
                        specialty.getSpecialtyId()
                )
                .orElse(null);
        if (existing != null) {
            existing.setTrainer(assignment.getTrainer());
            existing.setAssignment(assignment);
            dogSpecialtyEnrollmentRepository.save(existing);
            return;
        }

        List<TrainingRoadmap> roadmaps = trainingRoadmapRepository
                .findByTrainingSpecialtySpecialtyIdAndIsDeletedFalseOrderByRoadmapOrderAsc(specialty.getSpecialtyId())
                .stream()
                .filter(roadmap -> !Boolean.TRUE.equals(roadmap.getIsDeleted()))
                .toList();
        if (roadmaps.isEmpty()) {
            throw new BadRequestException("Specialty does not have any roadmap");
        }

        DogSpecialtyEnrollment enrollment = dogSpecialtyEnrollmentRepository.save(
                DogSpecialtyEnrollment.builder()
                        .dogProfile(assignment.getDogProfile())
                        .trainer(assignment.getTrainer())
                        .assignment(assignment)
                        .trainingSpecialty(specialty)
                        .templateVersion(specialty.getVersion())
                        .status(EnrollmentStatus.ENROLLED)
                        .progressPercent(BigDecimal.ZERO)
                        .build()
        );

        List<DogExerciseProgress> exerciseProgresses = new ArrayList<>();
        for (TrainingRoadmap roadmap : roadmaps) {
            List<TrainingPhase> phases = trainingPhaseRepository
                    .findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(roadmap.getRoadmapId());
            if (phases.isEmpty()) {
                throw new BadRequestException("Roadmap does not have any phase: " + roadmap.getRoadmapName());
            }

            for (TrainingPhase phase : phases) {
                List<RoadmapExercise> roadmapExercises = roadmapExerciseRepository
                        .findByTrainingPhasePhaseIdOrderByExerciseOrder(phase.getPhaseId());
                if (roadmapExercises.isEmpty()) {
                    throw new BadRequestException("Phase does not have any exercise: " + phase.getPhaseName());
                }

                for (RoadmapExercise roadmapExercise : roadmapExercises) {
                    exerciseProgresses.add(DogExerciseProgress.builder()
                            .enrollment(enrollment)
                            .roadmapExerciseId(roadmapExercise.getRoadmapExerciseId())
                            .roadmapId(roadmap.getRoadmapId())
                            .roadmapName(roadmap.getRoadmapName())
                            .roadmapOrder(roadmap.getRoadmapOrder())
                            .targetRole(roadmap.getTargetRole())
                            .phaseId(phase.getPhaseId())
                            .phaseName(phase.getPhaseName())
                            .phaseOrder(phase.getPhaseOrder())
                            .phaseDurationWeeks(phase.getPhaseDurationWeeks())
                            .phaseObjectives(phase.getPhaseObjectives())
                            .assessmentCriteria(phase.getAssessmentCriteria())
                            .exerciseId(roadmapExercise.getTrainingExercise().getExerciseId())
                            .exerciseName(roadmapExercise.getTrainingExercise().getExerciseName())
                            .exerciseOrder(roadmapExercise.getExerciseOrder())
                            .status(ExerciseProgressStatus.NOT_STARTED)
                            .build());
                }
            }
        }

        dogExerciseProgressRepository.saveAll(exerciseProgresses);
        recomputeAndPersist(enrollment.getEnrollmentId());
    }

    @Override
    public void suspendForAssignment(DogAssignment assignment) {
        dogSpecialtyEnrollmentRepository.findByAssignmentAssignmentIdAndIsDeletedFalse(assignment.getAssignmentId())
                .ifPresent(enrollment -> {
                    if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
                        enrollment.setStatus(EnrollmentStatus.SUSPENDED);
                        dogSpecialtyEnrollmentRepository.save(enrollment);
                    }
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrainingProgressSummaryResponse> getByDog(Integer dogId) {
        return dogSpecialtyEnrollmentRepository.findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(dogId)
                .stream()
                .map(enrollment -> buildDetail(enrollment, false).getSummary())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrainingProgressSummaryResponse> getByTrainer(Integer trainerId) {
        return dogSpecialtyEnrollmentRepository.findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(trainerId)
                .stream()
                .map(enrollment -> buildDetail(enrollment, false).getSummary())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrainingProgressSummaryResponse> getMine(Integer trainerId) {
        return getByTrainer(trainerId);
    }

    @Override
    @Transactional(readOnly = true)
    public TrainingProgressDetailResponse getDetail(Integer enrollmentId) {
        DogSpecialtyEnrollment enrollment = dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Training progress not found: " + enrollmentId));
        return buildDetail(enrollment, false);
    }

    @Override
    public TrainingProgressSummaryResponse updateEnrollment(Integer enrollmentId, UpdateTrainingProgressRequest request) {
        DogSpecialtyEnrollment enrollment = getEnrollment(enrollmentId);
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            EnrollmentStatus targetStatus = EnrollmentStatus.valueOf(request.getStatus().trim().toUpperCase());
            if (targetStatus == EnrollmentStatus.COMPLETED
                    && enrollment.getProgressPercent().compareTo(BigDecimal.valueOf(100)) < 0) {
                throw new BadRequestException("Cannot mark progress as COMPLETED before reaching 100%");
            }
            enrollment.setStatus(targetStatus);
            enrollment.setCompletedAt(targetStatus == EnrollmentStatus.COMPLETED ? LocalDateTime.now() : null);
        }
        if (request.getNotes() != null) {
            enrollment.setNotes(trimToNull(request.getNotes()));
        }
        dogSpecialtyEnrollmentRepository.save(enrollment);
        return buildDetail(enrollment, false).getSummary();
    }

    @Override
    public TrainingProgressSummaryResponse evaluateExercise(
            Integer progressId,
            EvaluateExerciseProgressRequest request,
            Integer evaluatorId) {
        DogExerciseProgress progress = dogExerciseProgressRepository.findDetailByProgressId(progressId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise progress not found: " + progressId));
        ExerciseProgressStatus status = ExerciseProgressStatus.valueOf(request.getStatus().trim().toUpperCase());
        progress.setStatus(status);
        progress.setScore(request.getScore());
        progress.setTrainerNotes(trimToNull(request.getTrainerNotes()));
        progress.setEvaluatedBy(getUser(evaluatorId));

        if (status == ExerciseProgressStatus.NOT_STARTED) {
            progress.setStartedAt(null);
            progress.setCompletedAt(null);
        } else if (status == ExerciseProgressStatus.IN_PROGRESS) {
            progress.setStartedAt(progress.getStartedAt() == null ? LocalDateTime.now() : progress.getStartedAt());
            progress.setCompletedAt(null);
        } else {
            progress.setStartedAt(progress.getStartedAt() == null ? LocalDateTime.now() : progress.getStartedAt());
            progress.setCompletedAt(LocalDateTime.now());
        }

        dogExerciseProgressRepository.save(progress);
        return recomputeAndPersist(progress.getEnrollment().getEnrollmentId()).getSummary();
    }

    private TrainingProgressDetailResponse recomputeAndPersist(Integer enrollmentId) {
        DogSpecialtyEnrollment enrollment = getEnrollment(enrollmentId);
        return buildDetail(enrollment, true);
    }

    private DogSpecialtyEnrollment getEnrollment(Integer enrollmentId) {
        return dogSpecialtyEnrollmentRepository.findDetailByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Training progress not found: " + enrollmentId));
    }

    private User getUser(Integer userId) {
        return userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private boolean isPrimaryTrainingAssignment(DogAssignment assignment) {
        return assignment != null
                && assignment.getAssignmentType() == AssignmentType.PRIMARY
                && assignment.getAssignmentScope() == AssignmentScope.FULL_TRAINING;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private TrainingProgressDetailResponse buildDetail(DogSpecialtyEnrollment enrollment, boolean persist) {
        List<DogExerciseProgress> exerciseProgresses =
                dogExerciseProgressRepository.findByEnrollmentIdWithDetails(enrollment.getEnrollmentId());

        Map<Integer, List<DogExerciseProgress>> roadmapBuckets = new LinkedHashMap<>();
        for (DogExerciseProgress progress : exerciseProgresses) {
            roadmapBuckets.computeIfAbsent(progress.getRoadmapId(), ignored -> new ArrayList<>()).add(progress);
        }

        int enrollmentTotalExercises = exerciseProgresses.size();
        int enrollmentDoneExercises = 0;
        String currentRoadmapName = null;
        Integer currentRoadmapOrder = null;
        String currentPhaseName = null;
        Integer currentPhaseOrder = null;
        List<RoadmapProgressResponse> roadmapResponses = new ArrayList<>();

        for (List<DogExerciseProgress> roadmapExercises : roadmapBuckets.values()) {
            DogExerciseProgress roadmapSeed = roadmapExercises.get(0);
            Map<Integer, List<DogExerciseProgress>> phaseBuckets = new LinkedHashMap<>();
            for (DogExerciseProgress progress : roadmapExercises) {
                phaseBuckets.computeIfAbsent(progress.getPhaseId(), ignored -> new ArrayList<>()).add(progress);
            }

            int roadmapDoneExercises = 0;
            Integer roadmapCurrentPhase = null;
            List<PhaseProgressResponse> phaseResponses = new ArrayList<>();

            for (List<DogExerciseProgress> phaseExercises : phaseBuckets.values()) {
                DogExerciseProgress phaseSeed = phaseExercises.get(0);
                int phaseDoneExercises = (int) phaseExercises.stream()
                        .filter(exercise -> DONE_STATUSES.contains(exercise.getStatus()))
                        .count();
                roadmapDoneExercises += phaseDoneExercises;
                enrollmentDoneExercises += phaseDoneExercises;

                if (roadmapCurrentPhase == null && phaseDoneExercises < phaseExercises.size()) {
                    roadmapCurrentPhase = phaseSeed.getPhaseOrder();
                    if (currentRoadmapName == null) {
                        currentRoadmapName = roadmapSeed.getRoadmapName();
                        currentRoadmapOrder = roadmapSeed.getRoadmapOrder();
                        currentPhaseName = phaseSeed.getPhaseName();
                        currentPhaseOrder = phaseSeed.getPhaseOrder();
                    }
                }

                List<ExerciseProgressResponse> exerciseResponses = phaseExercises.stream()
                        .map(progress -> ExerciseProgressResponse.builder()
                                .progressId(progress.getProgressId())
                                .exerciseId(progress.getExerciseId())
                                .exerciseName(progress.getExerciseName())
                                .status(progress.getStatus().name())
                                .score(progress.getScore())
                                .trainerNotes(progress.getTrainerNotes())
                                .completedAt(progress.getCompletedAt())
                                .build())
                        .toList();

                phaseResponses.add(PhaseProgressResponse.builder()
                        .phaseName(phaseSeed.getPhaseName())
                        .phaseOrder(phaseSeed.getPhaseOrder())
                        .totalExercises(phaseExercises.size())
                        .completedExercises(phaseDoneExercises)
                        .exercises(exerciseResponses)
                        .build());
            }

            if (roadmapCurrentPhase == null && !phaseResponses.isEmpty()) {
                PhaseProgressResponse lastPhase = phaseResponses.get(phaseResponses.size() - 1);
                roadmapCurrentPhase = lastPhase.getPhaseOrder();
                if (currentRoadmapName == null) {
                    currentRoadmapName = roadmapSeed.getRoadmapName();
                    currentRoadmapOrder = roadmapSeed.getRoadmapOrder();
                    currentPhaseName = lastPhase.getPhaseName();
                    currentPhaseOrder = lastPhase.getPhaseOrder();
                }
            }

            BigDecimal roadmapPercent = percent(roadmapDoneExercises, roadmapExercises.size());
            EnrollmentStatus roadmapStatus = deriveProgressStatus(roadmapPercent, roadmapExercises);

            roadmapResponses.add(RoadmapProgressResponse.builder()
                    .roadmapId(roadmapSeed.getRoadmapId())
                    .roadmapName(roadmapSeed.getRoadmapName())
                    .roadmapOrder(roadmapSeed.getRoadmapOrder())
                    .targetRole(roadmapSeed.getTargetRole())
                    .currentPhaseOrder(roadmapCurrentPhase)
                    .progressPercent(roadmapPercent)
                    .status(roadmapStatus.name())
                    .startedAt(resolveStartedAt(roadmapExercises))
                    .completedAt(roadmapPercent.compareTo(BigDecimal.valueOf(100)) == 0
                            ? resolveCompletedAt(roadmapExercises)
                            : null)
                    .phases(phaseResponses)
                    .build());
        }

        BigDecimal enrollmentPercent = percent(enrollmentDoneExercises, enrollmentTotalExercises);
        if (currentRoadmapName == null && !roadmapResponses.isEmpty()) {
            RoadmapProgressResponse lastRoadmap = roadmapResponses.get(roadmapResponses.size() - 1);
            currentRoadmapName = lastRoadmap.getRoadmapName();
            currentRoadmapOrder = lastRoadmap.getRoadmapOrder();
            if (lastRoadmap.getPhases() != null && !lastRoadmap.getPhases().isEmpty()) {
                PhaseProgressResponse lastPhase = lastRoadmap.getPhases().get(lastRoadmap.getPhases().size() - 1);
                currentPhaseName = lastPhase.getPhaseName();
                currentPhaseOrder = lastPhase.getPhaseOrder();
            }
        }

        if (enrollmentPercent.compareTo(BigDecimal.valueOf(100)) == 0) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(resolveCompletedAt(exerciseProgresses));
        } else if (enrollment.getStatus() != EnrollmentStatus.SUSPENDED
                && enrollment.getStatus() != EnrollmentStatus.WITHDRAWN) {
            enrollment.setStatus(enrollmentDoneExercises > 0 ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.ENROLLED);
            enrollment.setCompletedAt(null);
        }
        enrollment.setProgressPercent(enrollmentPercent);

        if (persist) {
            dogSpecialtyEnrollmentRepository.save(enrollment);
        }

        TrainingProgressSummaryResponse summary = TrainingProgressSummaryResponse.builder()
                .enrollmentId(enrollment.getEnrollmentId())
                .dogId(enrollment.getDogProfile().getDogId())
                .dogName(enrollment.getDogProfile().getDogName())
                .trainerId(enrollment.getTrainer().getUserId())
                .trainerName(enrollment.getTrainer().getFullName())
                .specialtyId(enrollment.getTrainingSpecialty().getSpecialtyId())
                .specialtyName(enrollment.getTrainingSpecialty().getSpecialtyName())
                .specialtyVersion(enrollment.getTemplateVersion())
                .currentRoadmapName(currentRoadmapName)
                .currentRoadmapOrder(currentRoadmapOrder)
                .currentPhaseName(currentPhaseName)
                .currentPhaseOrder(currentPhaseOrder)
                .progressPercent(enrollment.getProgressPercent())
                .status(enrollment.getStatus().name())
                .enrolledAt(enrollment.getEnrolledAt())
                .completedAt(enrollment.getCompletedAt())
                .notes(enrollment.getNotes())
                .build();

        return TrainingProgressDetailResponse.builder()
                .summary(summary)
                .roadmaps(roadmapResponses)
                .build();
    }

    private BigDecimal percent(int done, int total) {
        if (total <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(done)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private EnrollmentStatus deriveProgressStatus(BigDecimal percent, List<DogExerciseProgress> progresses) {
        if (percent.compareTo(BigDecimal.valueOf(100)) == 0) {
            return EnrollmentStatus.COMPLETED;
        }
        boolean started = progresses.stream().anyMatch(progress -> progress.getStatus() != ExerciseProgressStatus.NOT_STARTED);
        return started ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.ENROLLED;
    }

    private LocalDateTime resolveStartedAt(List<DogExerciseProgress> progresses) {
        return progresses.stream()
                .map(DogExerciseProgress::getStartedAt)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime resolveCompletedAt(List<DogExerciseProgress> progresses) {
        return progresses.stream()
                .map(DogExerciseProgress::getCompletedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }
}
