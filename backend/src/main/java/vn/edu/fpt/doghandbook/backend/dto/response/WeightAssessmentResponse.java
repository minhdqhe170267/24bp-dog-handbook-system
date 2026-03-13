package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeightAssessmentResponse {

    private Integer dogId;
    private String dogName;
    private String dogCode;
    private String breedName;
    private BigDecimal currentWeightKg;
    private Integer ageMonths;
    private String gender;
    private BigDecimal standardMinKg;
    private BigDecimal standardMaxKg;
    private BigDecimal deviationPercent;
    private String weightStatus;
    private String trend;
    private BigDecimal weightChangeKg;
    private List<WeightHistoryItem> recentHistory;
    private String recommendation;
    private String alertLevel;

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class WeightHistoryItem {
        private BigDecimal weightKg;
        private LocalDateTime recordDate;
        private BigDecimal changeKg;
    }
}
