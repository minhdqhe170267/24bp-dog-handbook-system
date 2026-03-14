package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class HealthSessionResponse {

    private Integer sessionId;

    private Integer dogId;
    private String dogName;
    private String dogCode;

    private Integer trainerId;
    private String trainerName;

    private String issueSummary;
    private Integer initialDiagnosisId;

    private String status;
    private String severity;

    private LocalDateTime startedAt;
    private LocalDateTime lastUpdateAt;
    private LocalDate followUpDate;

    private String resolutionNotes;
    private LocalDateTime resolvedAt;

    private List<FollowUpItemResponse> followUps;
}
