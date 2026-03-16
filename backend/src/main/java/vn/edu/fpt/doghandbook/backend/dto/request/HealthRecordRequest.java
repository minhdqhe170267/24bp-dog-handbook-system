package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.AppetiteLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class HealthRecordRequest {

    @NotNull
    private Integer dogId;

    @DecimalMin(value = "0", message = "Cân nặng phải >= 0")
    @DecimalMax(value = "200", message = "Cân nặng phải <= 200kg")
    private BigDecimal weightKg;

    @DecimalMin(value = "35", message = "Nhiệt độ phải >= 35°C")
    @DecimalMax(value = "43", message = "Nhiệt độ phải <= 43°C")
    private BigDecimal temperatureC;

    @ValidEnum(enumClass = FecesStatus.class, message = "Tình trạng phân không hợp lệ")
    private String fecesStatus;

    @ValidEnum(enumClass = AppetiteLevel.class, message = "Mức ăn uống không hợp lệ")
    private String appetiteLevel;

    @ValidEnum(enumClass = DogActivityLevel.class, message = "Mức hoạt động không hợp lệ")
    private String activityLevel;

    @Size(max = 5000, message = "Triệu chứng tối đa 5000 ký tự")
    private String observedSymptoms;

    @Size(max = 5000, message = "Chẩn đoán tối đa 5000 ký tự")
    private String diagnosis;

    @Size(max = 5000, message = "Điều trị tối đa 5000 ký tự")
    private String treatmentGiven;

    private LocalDate nextCheckupDate;

    @Size(max = 5000, message = "Ghi chú tối đa 5000 ký tự")
    private String notes;
}
