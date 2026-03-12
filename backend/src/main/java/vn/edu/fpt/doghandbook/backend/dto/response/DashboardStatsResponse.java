package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private long totalBreeds;
    private long totalExercises;
    private long totalDiseases;
    private long totalMedications;
    private long pendingReviewsCount;
    private long publishedThisMonth;
    private long totalUsers;
    private List<RecentActivityItem> recentActivities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivityItem {
        private String activityType;
        private String title;
        private String actorName;
        private LocalDateTime activityAt;
    }
}
