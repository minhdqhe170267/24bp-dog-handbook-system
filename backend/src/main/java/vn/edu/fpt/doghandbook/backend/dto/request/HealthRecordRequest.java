package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class HealthRecordRequest {

    @NotNull
    private Integer dogId;

    private BigDecimal weightKg;

    private BigDecimal temperatureC;

    private String fecesStatus;

    private String appetiteLevel;

    private String activityLevel;

    private String observedSymptoms;

    private String diagnosis;

    private String treatmentGiven;

    private LocalDate nextCheckupDate;

    private String notes;
}
