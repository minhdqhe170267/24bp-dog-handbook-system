package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class EnrollmentResponse {

    private Integer enrollmentId;
    private String dogName;
    private String breedName;
    private String roadmapName;
    private String targetRole;
    private Integer currentPhase;
    private Integer totalPhases;
    private double progressPercent;
    private String status;
    private String trainerName;
    private LocalDateTime enrolledAt;
}
