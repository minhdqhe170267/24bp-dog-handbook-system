package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for nutrition ration response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionRationResponse {

    private Long rationId;
    private Long standardId;
    private Long breedId;
    private String breedName;
    private String rationCode;
    private String rationName;
    private String foodItemName;
    private String foodCategory;
    private Double quantityPerDay;
    private String unit;
    private String mealTime;
    private Double caloriesKcal;
    private Double proteinGrams;
    private Double fatGrams;
    private Double carbGrams;
    private String preparationNotes;
    private String feedingInstructions;
    private Integer displayOrder;
    private String status;
    private NutritionStandardResponse standard;
}
