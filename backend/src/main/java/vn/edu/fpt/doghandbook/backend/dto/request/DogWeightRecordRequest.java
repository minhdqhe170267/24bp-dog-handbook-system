package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class DogWeightRecordRequest {

    @Size(max = 36, message = "Local ID tối đa 36 ký tự")
    private String localId;

    @NotNull(message = "dogId là bắt buộc")
    private Integer dogId;

    @NotNull(message = "recordedWeightKg là bắt buộc")
    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal recordedWeightKg;

    @DecimalMin(value = "0", message = "standardMinKg phải >= 0")
    private BigDecimal standardMinKg;

    @DecimalMin(value = "0", message = "standardMaxKg phải >= 0")
    private BigDecimal standardMaxKg;

    @ValidEnum(enumClass = WeightStatus.class, message = "Trạng thái cân nặng không hợp lệ")
    private String status;

    private BigDecimal deviationPercent;

    @Size(max = 5000, message = "Khuyến nghị tối đa 5000 ký tự")
    private String recommendation;

    private Integer followUpWeeks;

    private LocalDateTime assessedAt;
}
