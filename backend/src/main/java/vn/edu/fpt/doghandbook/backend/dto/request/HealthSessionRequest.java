package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class HealthSessionRequest {

    @NotNull
    private Integer dogId;

    @NotBlank
    private String issueSummary;

    private Integer initialDiagnosisId;

    private String severity = "MEDIUM";

    private LocalDate followUpDate;
}
