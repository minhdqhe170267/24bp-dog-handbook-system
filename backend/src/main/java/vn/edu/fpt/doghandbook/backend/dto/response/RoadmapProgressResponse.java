package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapProgressResponse {

    private Integer roadmapId;
    private String roadmapName;
    private Integer roadmapOrder;
    private String targetRole;
    private Integer currentPhaseOrder;
    private BigDecimal progressPercent;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private List<PhaseProgressResponse> phases;
}
