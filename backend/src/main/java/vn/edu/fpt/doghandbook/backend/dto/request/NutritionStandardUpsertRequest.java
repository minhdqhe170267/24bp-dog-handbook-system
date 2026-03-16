package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

/**
 * Request payload for creating/updating a nutrition standard.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionStandardUpsertRequest {

    @NotNull(message = "breedId is required")
    @Positive(message = "breedId must be greater than 0")
    private Long breedId;

    @NotBlank(message = "rationCode is required")
    @Size(max = 50, message = "rationCode must be at most 50 characters")
    private String rationCode;

    @NotBlank(message = "rationName is required")
    @Size(max = 200, message = "rationName must be at most 200 characters")
    private String rationName;

    @Size(max = 5000, message = "description must not exceed 5000 characters")
    private String description;

    @NotNull(message = "targetWeightMinKg is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "targetWeightMinKg must be greater than 0")
    private Double targetWeightMinKg;

    @NotNull(message = "targetWeightMaxKg is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "targetWeightMaxKg must be greater than 0")
    private Double targetWeightMaxKg;

    @NotNull(message = "targetAgeMinMonths is required")
    @Min(value = 0, message = "targetAgeMinMonths must be 0 or greater")
    private Integer targetAgeMinMonths;

    @NotNull(message = "targetAgeMaxMonths is required")
    @Min(value = 0, message = "targetAgeMaxMonths must be 0 or greater")
    private Integer targetAgeMaxMonths;

    @NotBlank(message = "activityLevel is required")
    @ValidEnum(enumClass = ActivityLevel.class, message = "activityLevel không hợp lệ")
    private String activityLevel;

    @ValidEnum(enumClass = HealthCondition.class, message = "healthCondition không hợp lệ")
    private String healthCondition;

    @NotNull(message = "dailyCalories is required")
    @Positive(message = "dailyCalories must be greater than 0")
    private Integer dailyCalories;

    @NotNull(message = "proteinGrams is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "proteinGrams must be greater than 0")
    private Double proteinGrams;

    @NotNull(message = "fatGrams is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "fatGrams must be greater than 0")
    private Double fatGrams;

    @NotNull(message = "carbGrams is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "carbGrams must be greater than 0")
    private Double carbGrams;

    @Size(max = 5000, message = "ingredientsList must not exceed 5000 characters")
    private String ingredientsList;

    @Size(max = 5000, message = "feedingSchedule must not exceed 5000 characters")
    private String feedingSchedule;

    @Size(max = 5000, message = "specialNotes must not exceed 5000 characters")
    private String specialNotes;

    @ValidEnum(enumClass = ContentStatus.class, message = "status không hợp lệ")
    private String status;
}
