package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Response payload for optional calculator verification endpoint.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionCalculatorVerifyResponse {

    private Long standardId;
    private String rationCode;
    private String rationName;
    private Integer baseDailyCalories;
    private Integer finalDailyCalories;
    private Double baseProteinGrams;
    private Double baseFatGrams;
    private Double baseCarbGrams;
    private Double finalProteinGrams;
    private Double finalFatGrams;
    private Double finalCarbGrams;
    private Double activityMultiplier;
    private Double healthMultiplier;
    private Double kcalAdjustPercent;
    private String feedingSchedule;
}
