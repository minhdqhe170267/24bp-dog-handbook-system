package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;

@Getter
@Setter
public class BreedRequest {

    @NotBlank(message = "Tên giống chó không được để trống")
    @Size(max = 100, message = "Tên giống chó tối đa 100 ký tự")
    private String breedName;

    @Size(max = 100, message = "Xuất xứ tối đa 100 ký tự")
    private String origin;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @ValidEnum(enumClass = SizeClassification.class, message = "Phân loại kích thước không hợp lệ")
    private String sizeClassification;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightMaleMinKg;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightMaleMaxKg;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightFemaleMinKg;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightFemaleMaxKg;

    @DecimalMin(value = "0", message = "Chiều cao phải >= 0")
    @DecimalMax(value = "200", message = "Chiều cao phải <= 200cm")
    private BigDecimal avgHeightCm;

    @Size(max = 20, message = "Tuổi thọ tối đa 20 ký tự")
    @Pattern(
            regexp = "^\\s*\\d{1,2}\\s*$",
            message = "Tuổi thọ phải là số năm hợp lệ, ví dụ 10"
    )
    private String lifespanYears;

    @ValidEnum(enumClass = TrainabilityLevel.class, message = "Mức huấn luyện không hợp lệ")
    private String trainabilityLevel;

    @Size(max = 5000, message = "Năng lực tác chiến tối đa 5000 ký tự")
    private String operationalCapabilities;

    @Size(max = 5000, message = "Metadata tối đa 5000 ký tự")
    private String metadata;

}
