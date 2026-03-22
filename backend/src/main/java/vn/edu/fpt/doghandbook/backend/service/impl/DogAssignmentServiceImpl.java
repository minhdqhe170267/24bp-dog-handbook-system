package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.DogAssignmentRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogAssignmentResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AssignmentType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DogAssignmentService;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.util.List;
import java.util.stream.Collectors;

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
        DogProfile dog = dogProfileRepository.findById(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Chó", "dogId", request.getDogId()));

        User trainer = userRepository.findById(request.getTrainerId())
                .orElseThrow(() -> new ResourceNotFoundException("Huấn luyện viên", "trainerId", request.getTrainerId()));

        if (dogAssignmentRepository.existsByDogProfileDogIdAndTrainerUserIdAndIsActiveTrue(
                request.getDogId(), request.getTrainerId())) {
            throw new BadRequestException("Chó này đã được phân công cho huấn luyện viên này");
        }

        DogAssignment assignment = DogAssignment.builder()
                .dogProfile(dog)
                .trainer(trainer)
                .assignmentType(parseAssignmentType(request.getAssignmentType()))
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
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

        DogProfile dog = dogProfileRepository.findById(request.getDogId())
                .orElseThrow(() -> new ResourceNotFoundException("Chó", "dogId", request.getDogId()));

        User trainer = userRepository.findById(request.getTrainerId())
                .orElseThrow(() -> new ResourceNotFoundException("Huấn luyện viên", "trainerId", request.getTrainerId()));

        assignment.setDogProfile(dog);
        assignment.setTrainer(trainer);
        assignment.setAssignmentType(parseAssignmentType(request.getAssignmentType()));
        assignment.setStartDate(request.getStartDate());
        assignment.setEndDate(request.getEndDate());
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
    }

    @Override
    @Transactional(readOnly = true)
    public List<DogAssignmentResponse> getByTrainer(Integer trainerId) {
        return dogAssignmentRepository.findByTrainerUserIdAndIsActiveTrue(trainerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DogAssignmentResponse> getByDog(Integer dogId) {
        return dogAssignmentRepository.findByDogProfileDogIdAndIsActiveTrue(dogId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DogAssignmentResponse getById(Integer assignmentId) {
        DogAssignment assignment = dogAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Phân công", "assignmentId", assignmentId));
        return toResponse(assignment);
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
                .assignmentType(assignment.getAssignmentType().name())
                .startDate(assignment.getStartDate())
                .endDate(assignment.getEndDate())
                .isActive(assignment.getIsActive())
                .notes(assignment.getNotes())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }

    private AssignmentType parseAssignmentType(String type) {
        if (type == null || type.isBlank()) return AssignmentType.PRIMARY;
        try {
            return AssignmentType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Loại phân công không hợp lệ: " + type + ". Chấp nhận: PRIMARY, SECONDARY, TEMPORARY");
        }
    }
}
