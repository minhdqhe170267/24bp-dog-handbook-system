package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogAssignmentResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentScope;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DogAssignmentService;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class DogAssignmentServiceImpl implements DogAssignmentService {

    private final DogAssignmentRepository dogAssignmentRepository;
    private final DogProfileRepository dogProfileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    public DogAssignmentResponse assign(DogAssignmentRequest request, Integer assignorId) {
        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();
        validateDateRange(startDate, endDate);

        DogProfile dog = getDog(request.getDogId());
        User trainer = getTrainer(request.getTrainerId());
        validateTrainerRole(trainer);

        AssignmentType assignmentType = parseAssignmentType(request.getAssignmentType());
        AssignmentScope assignmentScope = resolveAssignmentScope(assignmentType, request.getAssignmentScope());
        DogAssignment coveredAssignment = resolveCoveredAssignment(
                request.getCoveredAssignmentId(),
                null,
                dog,
                trainer,
                assignmentType,
                assignmentScope,
                startDate,
                endDate
        );

        validateAssignmentConflicts(
                null,
                dog,
                trainer,
                assignmentType,
                assignmentScope,
                startDate,
                endDate
        );

        DogAssignment assignment = DogAssignment.builder()
                .dogProfile(dog)
                .trainer(trainer)
                .assignmentType(assignmentType)
                .assignmentScope(assignmentScope)
                .coveredAssignment(coveredAssignment)
                .startDate(startDate)
                .endDate(endDate)
                .notes(request.getNotes())
                .build();

        assignment = dogAssignmentRepository.save(assignment);

        User assignor = userRepository.findById(assignorId).orElse(null);
        notificationService.notifyUser(
                trainer, assignor,
                NotificationType.ASSIGNMENT_CREATED,
                "Phân công mới: " + dog.getDogName(),
                "Bạn được phân công phụ trách chó " + dog.getDogName() + " (" + dog.getDogCode() + ")",
                "DOG_ASSIGNMENT", assignment.getAssignmentId()
        );

        return toResponse(assignment);
    }

    @Override
    public DogAssignmentResponse update(Integer assignmentId, DogAssignmentRequest request) {
        DogAssignment assignment = dogAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Phân công", "assignmentId", assignmentId));

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();
        validateDateRange(startDate, endDate);

        DogProfile dog = getDog(request.getDogId());
        User trainer = getTrainer(request.getTrainerId());
        validateTrainerRole(trainer);

        AssignmentType assignmentType = parseAssignmentType(request.getAssignmentType());
        AssignmentScope assignmentScope = resolveAssignmentScope(assignmentType, request.getAssignmentScope());
        DogAssignment coveredAssignment = resolveCoveredAssignment(
                request.getCoveredAssignmentId(),
                assignmentId,
                dog,
                trainer,
                assignmentType,
                assignmentScope,
                startDate,
                endDate
        );

        validateAssignmentConflicts(
                assignmentId,
                dog,
                trainer,
                assignmentType,
                assignmentScope,
                startDate,
                endDate
        );
        validateDependentAssignments(assignmentId, dog, assignmentType, assignmentScope, startDate, endDate);

        assignment.setDogProfile(dog);
        assignment.setTrainer(trainer);
        assignment.setAssignmentType(assignmentType);
        assignment.setAssignmentScope(assignmentScope);
        assignment.setCoveredAssignment(coveredAssignment);
        assignment.setStartDate(startDate);
        assignment.setEndDate(endDate);
        assignment.setNotes(request.getNotes());

        assignment = dogAssignmentRepository.save(assignment);
        return toResponse(assignment);
    }

    @Override
    public void unassign(Integer assignmentId) {
        DogAssignment assignment = dogAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Phân công", "assignmentId", assignmentId));

        assignment.setIsActive(false);
        dogAssignmentRepository.save(assignment);

        if (isPrimaryTrainingAssignment(assignment)) {
            List<DogAssignment> dependentAssignments =
                    dogAssignmentRepository.findByCoveredAssignmentAssignmentIdAndIsActiveTrue(assignmentId);
            for (DogAssignment dependentAssignment : dependentAssignments) {
                dependentAssignment.setIsActive(false);
                dogAssignmentRepository.save(dependentAssignment);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<DogAssignmentResponse> getByTrainer(Integer trainerId) {
        return dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(trainerId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DogAssignmentResponse> getByDog(Integer dogId) {
        return dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dogId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DogAssignmentResponse getById(Integer assignmentId) {
        DogAssignment assignment = dogAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Phân công", "assignmentId", assignmentId));
        return toResponse(assignment);
    }

    private DogProfile getDog(Integer dogId) {
        return dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId)
                .orElseThrow(() -> new ResourceNotFoundException("Chó", "dogId", dogId));
    }

    private User getTrainer(Integer trainerId) {
        return userRepository.findByUserIdAndIsDeletedFalse(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Huấn luyện viên", "trainerId", trainerId));
    }

    private void validateTrainerRole(User trainer) {
        if (trainer.getRole() != UserRole.TRAINER) {
            throw new BadRequestException("Người được phân công phải có vai trò TRAINER");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            throw new BadRequestException("Ngày bắt đầu không được để trống");
        }
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("Ngày kết thúc không được trước ngày bắt đầu");
        }
    }

    private AssignmentType parseAssignmentType(String type) {
        if (type == null || type.isBlank()) {
            return AssignmentType.PRIMARY;
        }
        try {
            return AssignmentType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Loại phân công không hợp lệ: " + type + ". Chấp nhận: PRIMARY, SECONDARY, TEMPORARY"
            );
        }
    }

    private AssignmentScope resolveAssignmentScope(AssignmentType assignmentType, String scope) {
        AssignmentScope resolvedScope;
        if (scope == null || scope.isBlank()) {
            resolvedScope = assignmentType == AssignmentType.PRIMARY
                    ? AssignmentScope.FULL_TRAINING
                    : AssignmentScope.CARE_ONLY;
        } else {
            try {
                resolvedScope = AssignmentScope.valueOf(scope.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException(
                        "Phạm vi phân công không hợp lệ: " + scope + ". Chấp nhận: FULL_TRAINING, CARE_ONLY"
                );
            }
        }

        if (assignmentType == AssignmentType.PRIMARY && resolvedScope != AssignmentScope.FULL_TRAINING) {
            throw new BadRequestException("Phân công PRIMARY phải có phạm vi FULL_TRAINING");
        }
        if (assignmentType != AssignmentType.PRIMARY && resolvedScope == AssignmentScope.FULL_TRAINING) {
            throw new BadRequestException("Phân công không phải PRIMARY chỉ được phép có phạm vi CARE_ONLY");
        }
        return resolvedScope;
    }

    private DogAssignment resolveCoveredAssignment(
            Integer coveredAssignmentId,
            Integer currentAssignmentId,
            DogProfile dog,
            User trainer,
            AssignmentType assignmentType,
            AssignmentScope assignmentScope,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (assignmentScope != AssignmentScope.CARE_ONLY) {
            if (coveredAssignmentId != null) {
                throw new BadRequestException("Chỉ phân công CARE_ONLY mới được gắn coveredAssignmentId");
            }
            return null;
        }

        if (assignmentType == AssignmentType.PRIMARY) {
            throw new BadRequestException("Phân công PRIMARY không thể có phạm vi CARE_ONLY");
        }

        DogAssignment coveredAssignment;
        if (coveredAssignmentId != null) {
            if (Objects.equals(coveredAssignmentId, currentAssignmentId)) {
                throw new BadRequestException("coveredAssignmentId không được trỏ về chính nó");
            }
            coveredAssignment = dogAssignmentRepository.findById(coveredAssignmentId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Phân công được bao phủ", "coveredAssignmentId", coveredAssignmentId
                    ));
        } else {
            List<DogAssignment> candidateAssignments = dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dog.getDogId())
                    .stream()
                    .filter(existingAssignment -> !Objects.equals(existingAssignment.getAssignmentId(), currentAssignmentId))
                    .filter(this::isPrimaryTrainingAssignment)
                    .filter(existingAssignment -> overlaps(
                            existingAssignment.getStartDate(),
                            existingAssignment.getEndDate(),
                            startDate,
                            endDate
                    ))
                    .toList();

            if (candidateAssignments.isEmpty()) {
                throw new BadRequestException(
                        "Phân công CARE_ONLY phải gắn với một phân công PRIMARY đang hiệu lực cùng chó"
                );
            }
            if (candidateAssignments.size() > 1) {
                throw new BadRequestException(
                        "Dữ liệu phân công PRIMARY của chó đang bị chồng chéo, không thể tạo CARE_ONLY"
                );
            }
            coveredAssignment = candidateAssignments.get(0);
        }

        if (!Boolean.TRUE.equals(coveredAssignment.getIsActive())) {
            throw new BadRequestException("Phân công được bao phủ không còn hiệu lực");
        }
        if (!Objects.equals(coveredAssignment.getDogProfile().getDogId(), dog.getDogId())) {
            throw new BadRequestException("Phân công CARE_ONLY phải tham chiếu tới PRIMARY của cùng một chó");
        }
        if (!isPrimaryTrainingAssignment(coveredAssignment)) {
            throw new BadRequestException("coveredAssignmentId phải là phân công PRIMARY có phạm vi FULL_TRAINING");
        }
        if (!overlaps(coveredAssignment.getStartDate(), coveredAssignment.getEndDate(), startDate, endDate)) {
            throw new BadRequestException(
                    "Thời gian CARE_ONLY phải nằm trong hoặc giao nhau với thời gian của phân công PRIMARY"
            );
        }
        if (Objects.equals(coveredAssignment.getTrainer().getUserId(), trainer.getUserId())) {
            throw new BadRequestException("Người chăm sóc tạm phải khác huấn luyện viên chính");
        }
        return coveredAssignment;
    }

    private void validateAssignmentConflicts(
            Integer currentAssignmentId,
            DogProfile dog,
            User trainer,
            AssignmentType assignmentType,
            AssignmentScope assignmentScope,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<DogAssignment> dogAssignments = dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dog.getDogId())
                .stream()
                .filter(existingAssignment -> !Objects.equals(existingAssignment.getAssignmentId(), currentAssignmentId))
                .toList();

        List<DogAssignment> trainerAssignments = dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(trainer.getUserId())
                .stream()
                .filter(existingAssignment -> !Objects.equals(existingAssignment.getAssignmentId(), currentAssignmentId))
                .toList();

        boolean hasSamePairOverlap = dogAssignments.stream()
                .filter(existingAssignment -> Objects.equals(
                        existingAssignment.getTrainer().getUserId(),
                        trainer.getUserId()
                ))
                .anyMatch(existingAssignment -> overlaps(
                        existingAssignment.getStartDate(),
                        existingAssignment.getEndDate(),
                        startDate,
                        endDate
                ));
        if (hasSamePairOverlap) {
            throw new BadRequestException("Cặp chó và huấn luyện viên này đã có phân công trùng thời gian");
        }

        if (assignmentScope == AssignmentScope.FULL_TRAINING) {
            boolean dogHasPrimaryConflict = dogAssignments.stream()
                    .filter(this::isPrimaryTrainingAssignment)
                    .anyMatch(existingAssignment -> overlaps(
                            existingAssignment.getStartDate(),
                            existingAssignment.getEndDate(),
                            startDate,
                            endDate
                    ));
            if (dogHasPrimaryConflict) {
                throw new BadRequestException("Chó này đã có huấn luyện viên chính trong khoảng thời gian đã chọn");
            }

            boolean trainerHasPrimaryConflict = trainerAssignments.stream()
                    .filter(this::isPrimaryTrainingAssignment)
                    .anyMatch(existingAssignment -> overlaps(
                            existingAssignment.getStartDate(),
                            existingAssignment.getEndDate(),
                            startDate,
                            endDate
                    ));
            if (trainerHasPrimaryConflict) {
                throw new BadRequestException(
                        "Huấn luyện viên này đã có chó phụ trách chính trong khoảng thời gian đã chọn"
                );
            }
        } else {
            boolean dogHasCareConflict = dogAssignments.stream()
                    .filter(this::isCareOnlyAssignment)
                    .anyMatch(existingAssignment -> overlaps(
                            existingAssignment.getStartDate(),
                            existingAssignment.getEndDate(),
                            startDate,
                            endDate
                    ));
            if (dogHasCareConflict) {
                throw new BadRequestException("Chó này đã có người chăm sóc tạm trong khoảng thời gian đã chọn");
            }
        }

        if (assignmentType == AssignmentType.PRIMARY && assignmentScope != AssignmentScope.FULL_TRAINING) {
            throw new BadRequestException("Phân công PRIMARY phải có phạm vi FULL_TRAINING");
        }
    }

    private void validateDependentAssignments(
            Integer assignmentId,
            DogProfile dog,
            AssignmentType assignmentType,
            AssignmentScope assignmentScope,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<DogAssignment> dependentAssignments =
                dogAssignmentRepository.findByCoveredAssignmentAssignmentIdAndIsActiveTrue(assignmentId);
        if (dependentAssignments.isEmpty()) {
            return;
        }

        if (!isPrimaryTrainingAssignment(assignmentType, assignmentScope)) {
            throw new BadRequestException(
                    "Không thể đổi loại/phạm vi của phân công PRIMARY khi vẫn còn CARE_ONLY đang bao phủ"
            );
        }

        boolean keepsDependentsValid = dependentAssignments.stream().allMatch(dependentAssignment ->
                Objects.equals(dependentAssignment.getDogProfile().getDogId(), dog.getDogId())
                        && overlaps(
                        dependentAssignment.getStartDate(),
                        dependentAssignment.getEndDate(),
                        startDate,
                        endDate
                )
        );
        if (!keepsDependentsValid) {
            throw new BadRequestException(
                    "Không thể cập nhật phân công PRIMARY vì sẽ làm mất hiệu lực các phân công CARE_ONLY đang bao phủ"
            );
        }
    }

    private boolean isPrimaryTrainingAssignment(DogAssignment assignment) {
        return assignment != null
                && isPrimaryTrainingAssignment(assignment.getAssignmentType(), assignment.getAssignmentScope());
    }

    private boolean isPrimaryTrainingAssignment(AssignmentType assignmentType, AssignmentScope assignmentScope) {
        return assignmentType == AssignmentType.PRIMARY && assignmentScope == AssignmentScope.FULL_TRAINING;
    }

    private boolean isCareOnlyAssignment(DogAssignment assignment) {
        return assignment != null && assignment.getAssignmentScope() == AssignmentScope.CARE_ONLY;
    }

    private boolean overlaps(
            LocalDate firstStart,
            LocalDate firstEnd,
            LocalDate secondStart,
            LocalDate secondEnd
    ) {
        LocalDate normalizedFirstEnd = firstEnd != null ? firstEnd : LocalDate.MAX;
        LocalDate normalizedSecondEnd = secondEnd != null ? secondEnd : LocalDate.MAX;
        return !normalizedFirstEnd.isBefore(secondStart) && !normalizedSecondEnd.isBefore(firstStart);
    }

    private DogAssignmentResponse toResponse(DogAssignment assignment) {
        return DogAssignmentResponse.builder()
                .assignmentId(assignment.getAssignmentId())
                .dogId(assignment.getDogProfile().getDogId())
                .dogName(assignment.getDogProfile().getDogName())
                .dogCode(assignment.getDogProfile().getDogCode())
                .trainerId(assignment.getTrainer().getUserId())
                .trainerName(assignment.getTrainer().getFullName())
                .trainerUsername(assignment.getTrainer().getUsername())
                .assignmentType(assignment.getAssignmentType() != null ? assignment.getAssignmentType().name() : null)
                .assignmentScope(assignment.getAssignmentScope() != null ? assignment.getAssignmentScope().name() : null)
                .coveredAssignmentId(assignment.getCoveredAssignment() != null
                        ? assignment.getCoveredAssignment().getAssignmentId()
                        : null)
                .startDate(assignment.getStartDate())
                .endDate(assignment.getEndDate())
                .isActive(assignment.getIsActive())
                .notes(assignment.getNotes())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}
