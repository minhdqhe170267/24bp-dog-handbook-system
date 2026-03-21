package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainerDashboardStatsResponse {

    private List<AssignedDogItem> assignedDogs;
    private long totalFieldNotes;
    private long totalReports;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedDogItem {
        private Integer dogId;
        private String dogCode;
        private String dogName;
        private Integer breedId;
        private String breedName;
        private String imageUrl;
        private String assignmentType;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
