package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class DogProfileRequest {

    @NotBlank(message = "Tên chó không được để trống")
    @Size(max = 100, message = "Tên chó tối đa 100 ký tự")
    private String dogName;

    @NotNull
    private Integer breedId;

    @ValidEnum(enumClass = DogGender.class, message = "Giới tính không hợp lệ")
    private String gender;

    private LocalDate dateOfBirth;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal currentWeightKg;

    @DecimalMin(value = "0", message = "Chiều cao phải >= 0")
    @DecimalMax(value = "200", message = "Chiều cao phải <= 200cm")
    private BigDecimal heightCm;

    @Size(max = 100, message = "Màu lông tối đa 100 ký tự")
    private String color;

    @Size(max = 50, message = "Mã chip tối đa 50 ký tự")
    private String microchipId;

    @ValidEnum(enumClass = DogStatus.class, message = "Trạng thái chó không hợp lệ")
    private String status;

    @Size(max = 500, message = "URL ảnh tối đa 500 ký tự")
    private String imageUrl;

    @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
    private String notes;
}
