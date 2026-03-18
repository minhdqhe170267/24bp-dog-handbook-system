package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class HealthSessionRequest {

    @NotNull
    private Integer dogId;

    @NotBlank(message = "Tóm tắt vấn đề không được để trống")
    @Size(max = 500, message = "Tóm tắt vấn đề tối đa 500 ký tự")
    private String issueSummary;

    private Integer initialDiagnosisId;

    @ValidEnum(enumClass = SessionSeverity.class, message = "Mức nghiêm trọng không hợp lệ")
    private String severity = "MEDIUM";

    private LocalDate followUpDate;

    private LocalDateTime localUpdatedAt;
}
