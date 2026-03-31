package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;

@Getter
@Setter
public class EvaluateExerciseRequest {

    @NotNull(message = "exerciseId không được để trống")
    @Positive(message = "exerciseId phải > 0")
    private Integer exerciseId;

    @NotNull(message = "status không được để trống")
    @ValidEnum(enumClass = ExerciseProgressStatus.class, message = "Trạng thái bài tập không hợp lệ")
    private String status;

    @DecimalMin(value = "0.0", message = "score phải từ 0 đến 10")
    @DecimalMax(value = "10.0", message = "score phải từ 0 đến 10")
    private BigDecimal score;

    @Size(max = 5000, message = "Nhận xét tối đa 5000 ký tự")
    private String trainerNotes;
}
