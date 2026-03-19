package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SymptomRequest {

    @NotBlank(message = "Mã triệu chứng không được để trống")
    @Size(max = 50, message = "Mã triệu chứng tối đa 50 ký tự")
    private String symptomCode;

    @NotBlank(message = "Tên triệu chứng không được để trống")
    @Size(max = 150, message = "Tên triệu chứng tối đa 150 ký tự")
    private String symptomName;

    @NotBlank(message = "Danh mục không được để trống")
    private String category;

    @Min(value = 1, message = "Mức độ nghiêm trọng phải >= 1")
    @Max(value = 5, message = "Mức độ nghiêm trọng phải <= 5")
    private Integer severityIndicator = 1;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;
}
