package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.FollowUpStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class SessionFollowUpRequest {

    @NotNull
    private Integer sessionId;

    @NotBlank(message = "Cập nhật trạng thái không được để trống")
    @ValidEnum(enumClass = FollowUpStatus.class, message = "Trạng thái theo dõi không hợp lệ")
    private String statusUpdate;

    @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
    private String notes;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightKg;

    @DecimalMin(value = "35", message = "Nhiệt độ phải >= 35°C")
    @DecimalMax(value = "43", message = "Nhiệt độ phải <= 43°C")
    private BigDecimal temperatureC;

    @Size(max = 500, message = "Hành động tiếp theo tối đa 500 ký tự")
    private String nextAction;

    private LocalDateTime localUpdatedAt;
}
