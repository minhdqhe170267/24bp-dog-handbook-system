package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HealthRecordResponse {

    private Integer recordId;

    private Integer dogId;
    private String dogName;
    private String dogCode;

    private Integer examinerId;
    private String examinerName;

    private LocalDateTime examinationDate;

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

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
