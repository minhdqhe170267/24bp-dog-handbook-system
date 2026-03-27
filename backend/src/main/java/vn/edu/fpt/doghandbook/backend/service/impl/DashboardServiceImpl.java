package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.TrainerDashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FieldNoteRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.DashboardService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final DogBreedRepository dogBreedRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final DiseaseRepository diseaseRepository;
    private final MedicationRepository medicationRepository;
    private final ContentRepository contentRepository;
    private final UserRepository userRepository;
    private final DogAssignmentRepository dogAssignmentRepository;
    private final FieldNoteRepository fieldNoteRepository;
    private final OperationReportRepository operationReportRepository;

    @Override
    public DashboardStatsResponse getStats() {
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime nextMonthStart = monthStart.plusMonths(1);

        return DashboardStatsResponse.builder()
                .totalBreeds(dogBreedRepository.countByIsDeletedFalse())
                .totalExercises(trainingExerciseRepository.countByIsDeletedFalse())
                .totalDiseases(diseaseRepository.countByIsDeletedFalse())
                .totalMedications(medicationRepository.countByIsDeletedFalse())
                .pendingReviewsCount(contentRepository.countByStatusAndIsDeletedFalse(ContentStatus.PENDING))
                .publishedThisMonth(contentRepository.countByStatusAndPublishedAtBetweenAndIsDeletedFalse(
                        ContentStatus.PUBLISHED,
                        monthStart,
                        nextMonthStart
                ))
                .totalUsers(userRepository.countByIsDeletedFalse())
                .recentActivities(getRecentActivities())
                .build();
    }

    @Override
    public TrainerDashboardStatsResponse getTrainerStats(Integer trainerId) {
        userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", trainerId));

        Pageable countPageable = PageRequest.of(0, 1);
        long totalFieldNotes = fieldNoteRepository
                .findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(trainerId, countPageable)
                .getTotalElements();
        long totalReports = operationReportRepository
                .findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(trainerId, countPageable)
                .getTotalElements();

        List<TrainerDashboardStatsResponse.AssignedDogItem> assignedDogs = toAssignedDogs(
                dogAssignmentRepository.findEffectiveByTrainerUserId(trainerId, LocalDate.now())
        );

        return TrainerDashboardStatsResponse.builder()
                .assignedDogs(assignedDogs)
                .totalFieldNotes(totalFieldNotes)
                .totalReports(totalReports)
                .build();
    }

    private List<DashboardStatsResponse.RecentActivityItem> getRecentActivities() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "updatedAt"));
        return contentRepository.findByIsDeletedFalse(pageable)
                .getContent()
                .stream()
                .map(this::toRecentActivity)
                .toList();
    }

    private DashboardStatsResponse.RecentActivityItem toRecentActivity(Content content) {
        return DashboardStatsResponse.RecentActivityItem.builder()
                .activityType("CONTENT_" + (content.getStatus() == null ? "UNKNOWN" : content.getStatus().name()))
                .title(content.getTitle())
                .actorName(resolveUserFullName(content.getAuthor()))
                .activityAt(content.getUpdatedAt() != null ? content.getUpdatedAt() : content.getCreatedAt())
                .build();
    }

    private List<TrainerDashboardStatsResponse.AssignedDogItem> toAssignedDogs(List<DogAssignment> assignments) {
        Map<Integer, TrainerDashboardStatsResponse.AssignedDogItem> assignedDogs = new LinkedHashMap<>();

        assignments.stream()
                .filter(assignment -> assignment != null && assignment.getDogProfile() != null)
                .filter(assignment -> !Boolean.TRUE.equals(assignment.getDogProfile().getIsDeleted()))
                .sorted(Comparator
                        .comparing(DogAssignment::getStartDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(DogAssignment::getAssignmentId, Comparator.nullsLast(Comparator.reverseOrder())))
                .forEach(assignment -> {
                    DogProfile dog = assignment.getDogProfile();
                    assignedDogs.putIfAbsent(dog.getDogId(), toAssignedDog(assignment, dog));
                });

        return List.copyOf(assignedDogs.values());
    }

    private TrainerDashboardStatsResponse.AssignedDogItem toAssignedDog(DogAssignment assignment, DogProfile dog) {
        DogBreed breed = dog.getDogBreed();
        return TrainerDashboardStatsResponse.AssignedDogItem.builder()
                .dogId(dog.getDogId())
                .dogCode(dog.getDogCode())
                .dogName(dog.getDogName())
                .breedId(breed != null ? breed.getBreedId() : null)
                .breedName(breed != null ? breed.getBreedName() : null)
                .imageUrl(dog.getImageUrl())
                .assignmentType(assignment.getAssignmentType() != null ? assignment.getAssignmentType().name() : null)
                .assignmentScope(assignment.getAssignmentScope() != null ? assignment.getAssignmentScope().name() : null)
                .startDate(assignment.getStartDate())
                .endDate(assignment.getEndDate())
                .build();
    }

    private String resolveUserFullName(User user) {
        if (user == null) {
            return null;
        }
        try {
            return user.getFullName();
        } catch (EntityNotFoundException ex) {
            return null;
        }
    }
}
