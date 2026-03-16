package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class NutritionStandardRequest {

    @NotBlank(message = "Mã khẩu phần không được để trống")
    @Size(max = 50, message = "Mã khẩu phần tối đa 50 ký tự")
    private String rationCode;

    @NotBlank(message = "Tên khẩu phần không được để trống")
    @Size(max = 200, message = "Tên khẩu phần tối đa 200 ký tự")
    private String rationName;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    private Integer breedId;

    @Min(value = 0, message = "Tuổi tối thiểu phải >= 0")
    @Max(value = 240, message = "Tuổi tối thiểu phải <= 240")
    private Integer targetAgeMinMonths;

    @Min(value = 0, message = "Tuổi tối đa phải >= 0")
    @Max(value = 240, message = "Tuổi tối đa phải <= 240")
    private Integer targetAgeMaxMonths;

    @NotNull
    @ValidEnum(enumClass = ActivityLevel.class, message = "Mức hoạt động không hợp lệ")
    private String activityLevel;

    @ValidEnum(enumClass = HealthCondition.class, message = "Tình trạng sức khỏe không hợp lệ")
    private String healthCondition = "NORMAL";

    @Size(max = 5000, message = "Metadata tối đa 5000 ký tự")
    private String metadata;

    @Size(max = 5000, message = "Ghi chú đặc biệt tối đa 5000 ký tự")
    private String specialNotes;
}
