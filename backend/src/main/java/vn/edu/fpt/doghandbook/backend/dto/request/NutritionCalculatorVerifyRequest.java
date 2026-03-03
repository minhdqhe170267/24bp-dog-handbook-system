package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Optional request payload for calculator verification from web-admin.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionCalculatorVerifyRequest {

    @NotNull(message = "standardId is required")
    @Positive(message = "standardId must be greater than 0")
    private Long standardId;

    @Size(max = 20, message = "activityLevel is invalid")
    private String activityLevel;

    @Size(max = 20, message = "healthCondition is invalid")
    private String healthCondition;

    @DecimalMin(value = "-90.0", message = "kcalAdjustPercent must be >= -90")
    @DecimalMax(value = "300.0", message = "kcalAdjustPercent must be <= 300")
    private Double kcalAdjustPercent;
}
