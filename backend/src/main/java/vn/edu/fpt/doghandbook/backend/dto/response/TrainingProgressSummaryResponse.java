package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TrainingProgressSummaryResponse {

    private Integer enrollmentId;
    private Integer dogId;
    private String dogName;
    private Integer trainerId;
    private String trainerName;
    private Integer specialtyId;
    private String specialtyName;
    private Integer specialtyVersion;
    private String currentRoadmapName;
    private Integer currentRoadmapOrder;
    private String currentPhaseName;
    private Integer currentPhaseOrder;
    private BigDecimal progressPercent;
    private String status;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private String notes;
}
