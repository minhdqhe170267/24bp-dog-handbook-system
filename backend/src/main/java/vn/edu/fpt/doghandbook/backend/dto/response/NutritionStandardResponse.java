package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for nutrition standard response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionStandardResponse {

    private Long standardId;
    private Long breedId;
    private String breedName;
    private String rationCode;
    private String rationName;
    private String description;
    private Double targetWeightMinKg;
    private Double targetWeightMaxKg;
    private Integer targetAgeMinMonths;
    private Integer targetAgeMaxMonths;
    private String activityLevel;
    private String healthCondition;
    private Integer dailyCalories;
    private Double proteinGrams;
    private Double fatGrams;
    private Double carbGrams;
    private String ingredientsList;
    private String feedingSchedule;
    private String specialNotes;
    private String status;
}
