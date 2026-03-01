package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class NutritionCalculateRequest {

    @NotNull
    private Integer breedId;

    @NotNull
    @DecimalMin("0.5")
    @DecimalMax("100")
    private BigDecimal weightKg;

    @NotNull
    @Min(1)
    @Max(240)
    private Integer ageMonths;

    @NotNull
    private String activityLevel;

    @NotNull
    private String gender;

    private String healthCondition = "NORMAL";
}
