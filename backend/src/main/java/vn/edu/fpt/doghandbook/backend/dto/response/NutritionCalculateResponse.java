package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class NutritionCalculateResponse {

    private BigDecimal dailyCalories;
    private BigDecimal proteinG;
    private BigDecimal fatG;
    private BigDecimal carbG;
    private String weightStatus;
    private BigDecimal deviationPercent;
    private String recommendation;
    private SuggestedRation suggestedRation;
    private String formula;

    @Getter
    @Setter
    @Builder
    public static class SuggestedRation {
        private Integer standardId;
        private String rationCode;
        private String rationName;
    }
}
