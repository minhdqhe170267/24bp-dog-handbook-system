package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DevelopmentStageResponse {

    private Integer stageId;
    private Integer breedId;
    private String breedName;
    private String stageName;
    private Integer ageMinMonths;
    private Integer ageMaxMonths;
    private Integer stageOrder;
    private String physicalMilestones;
    private String behavioralMilestones;
    private String trainingNotes;
    private String nutritionNotes;
    private String status;
    private LocalDateTime createdAt;
}
