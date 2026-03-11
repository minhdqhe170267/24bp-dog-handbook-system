package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.DashboardStatsResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DashboardService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
