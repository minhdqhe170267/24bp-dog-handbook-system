package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingMethodRequest {

    @NotBlank(message = "Tên phương pháp không được để trống")
    @Size(max = 200, message = "Tên phương pháp tối đa 200 ký tự")
    private String methodName;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @Size(max = 5000, message = "Ưu điểm tối đa 5000 ký tự")
    private String advantages;

    @Size(max = 5000, message = "Nhược điểm tối đa 5000 ký tự")
    private String disadvantages;

    @Size(max = 5000, message = "Hướng dẫn tối đa 5000 ký tự")
    private String instructions;
}
