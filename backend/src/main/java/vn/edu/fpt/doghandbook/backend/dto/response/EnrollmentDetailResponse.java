package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class EnrollmentDetailResponse {

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
    private List<PhaseProgressResponse> phases;
}
