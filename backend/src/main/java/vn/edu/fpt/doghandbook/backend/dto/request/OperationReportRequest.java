package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class OperationReportRequest {

    @NotNull
    private Integer dogId;

    @NotBlank
    private String reportType;

    @NotBlank
    private String reportTitle;

    @NotNull
    private LocalDate reportDate;

    private String reportContent;

    private String metadata;
}
