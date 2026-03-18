package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class OperationReportRequest {

    @NotNull
    private Integer dogId;

    @NotBlank(message = "Loại báo cáo không được để trống")
    @ValidEnum(enumClass = ReportType.class, message = "Loại báo cáo không hợp lệ")
    private String reportType;

    @NotBlank(message = "Tiêu đề báo cáo không được để trống")
    @Size(max = 200, message = "Tiêu đề báo cáo tối đa 200 ký tự")
    private String reportTitle;

    @NotNull
    private LocalDate reportDate;

    @Size(max = 50000, message = "Nội dung báo cáo tối đa 50000 ký tự")
    private String reportContent;

    @Size(max = 5000, message = "Metadata tối đa 5000 ký tự")
    private String metadata;

    private LocalDateTime localUpdatedAt;
}
