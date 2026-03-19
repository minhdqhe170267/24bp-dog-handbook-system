package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

/**
 * Request payload for creating/updating a nutrition ration item.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionRationUpsertRequest {

    @NotNull(message = "standardId is required")
    @Positive(message = "standardId must be greater than 0")
    private Long standardId;

    @NotBlank(message = "foodItemName is required")
    @Size(max = 150, message = "foodItemName must be at most 150 characters")
    private String foodItemName;

    @Size(max = 20, message = "foodCategory is invalid")
    private String foodCategory;

    @NotNull(message = "quantityPerDay is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "quantityPerDay must be greater than 0")
    private Double quantityPerDay;

    @NotBlank(message = "unit is required")
    @Size(max = 20, message = "unit must be at most 20 characters")
    private String unit;

    @NotBlank(message = "mealTime is required")
    @Size(max = 20, message = "mealTime is invalid")
    private String mealTime;

    @PositiveOrZero(message = "caloriesKcal must be 0 or greater")
    private Double caloriesKcal;

    @PositiveOrZero(message = "proteinGrams must be 0 or greater")
    private Double proteinGrams;

    @PositiveOrZero(message = "fatGrams must be 0 or greater")
    private Double fatGrams;

    @PositiveOrZero(message = "carbGrams must be 0 or greater")
    private Double carbGrams;

    @Size(max = 5000, message = "preparationNotes must not exceed 5000 characters")
    private String preparationNotes;

    @Size(max = 5000, message = "feedingInstructions must not exceed 5000 characters")
    private String feedingInstructions;

    @NotNull(message = "displayOrder is required")
    @Positive(message = "displayOrder must be greater than 0")
    private Integer displayOrder;

    @ValidEnum(enumClass = ContentStatus.class, message = "status không hợp lệ")
    private String status;
}
