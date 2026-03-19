package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

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

    @ValidEnum(enumClass = ActivityLevel.class, message = "activityLevel không hợp lệ")
    private String activityLevel;

    @ValidEnum(enumClass = HealthCondition.class, message = "healthCondition không hợp lệ")
    private String healthCondition;

    @DecimalMin(value = "-90.0", message = "kcalAdjustPercent must be >= -90")
    @DecimalMax(value = "300.0", message = "kcalAdjustPercent must be <= 300")
    private Double kcalAdjustPercent;
}
