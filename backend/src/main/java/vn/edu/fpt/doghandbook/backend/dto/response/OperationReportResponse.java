package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OperationReportResponse {

    private Integer reportId;
    private Integer trainerId;
    private String trainerName;
    private Integer dogId;
    private String dogName;
    private String dogCode;
    private String reportType;
    private String reportTitle;
    private LocalDate reportDate;
    private String reportContent;
    private String metadata;
    private String exportUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
