package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class TrainingExerciseRequest {

    @NotBlank(message = "Tên bài tập không được để trống")
    @Size(max = 200, message = "Tên bài tập tối đa 200 ký tự")
    private String exerciseName;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @NotNull(message = "Mức độ khó không được để trống")
    @ValidEnum(enumClass = DifficultyLevel.class, message = "Mức độ khó không hợp lệ")
    private String difficultyLevel;

    private Integer methodId;

    @Size(max = 5000, message = "Hướng dẫn tối đa 5000 ký tự")
    private String instructions;

    @NotNull(message = "Thời lượng không được để trống")
    @Min(value = 1, message = "Thời lượng phải >= 1 phút")
    @Max(value = 480, message = "Thời lượng phải <= 480 phút")
    private Integer durationMinutes;

    @Size(max = 5000, message = "Lưu ý an toàn tối đa 5000 ký tự")
    private String safetyPrecautions;

    @Size(max = 500, message = "Thiết bị yêu cầu tối đa 500 ký tự")
    private String requiredEquipment;

    @Size(max = 5000, message = "URL media tối đa 5000 ký tự")
    private String mediaUrls;
}
