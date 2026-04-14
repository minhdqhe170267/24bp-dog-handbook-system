package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingSpecialtyRequest {

    @NotBlank(message = "Mã chuyên ngành không được để trống")
    @Size(max = 50, message = "Mã chuyên ngành tối đa 50 ký tự")
    private String specialtyCode;

    @NotBlank(message = "Tên chuyên ngành không được để trống")
    @Size(max = 150, message = "Tên chuyên ngành tối đa 150 ký tự")
    private String specialtyName;

    @Size(max = 5000, message = "Mô tả chuyên ngành tối đa 5000 ký tự")
    private String description;

    private Boolean isActive;
}
