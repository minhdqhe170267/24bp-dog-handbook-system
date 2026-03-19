package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

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
    @ValidEnum(enumClass = ActivityLevel.class, message = "Mức hoạt động không hợp lệ")
    private String activityLevel;

    @NotNull
    @ValidEnum(enumClass = DogGender.class, message = "Giới tính không hợp lệ")
    private String gender;

    @ValidEnum(enumClass = HealthCondition.class, message = "Tình trạng sức khỏe không hợp lệ")
    private String healthCondition = "NORMAL";
}
