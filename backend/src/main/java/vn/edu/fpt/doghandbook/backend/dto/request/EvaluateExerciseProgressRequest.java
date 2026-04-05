package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;

@Getter
@Setter
public class EvaluateExerciseProgressRequest {

    @NotBlank(message = "Trạng thái bài tập không được để trống")
    @ValidEnum(enumClass = ExerciseProgressStatus.class, message = "Trạng thái bài tập không hợp lệ")
    private String status;

    @DecimalMin(value = "0.0", message = "Điểm phải từ 0 đến 10")
    @DecimalMax(value = "10.0", message = "Điểm phải từ 0 đến 10")
    private BigDecimal score;

    @Size(max = 5000, message = "Ghi chú huấn luyện tối đa 5000 ký tự")
    private String trainerNotes;
}
