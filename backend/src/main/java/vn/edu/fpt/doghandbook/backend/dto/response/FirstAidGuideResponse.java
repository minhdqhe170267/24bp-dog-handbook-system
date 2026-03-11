package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirstAidGuideResponse {

    private Integer guideId;
    private String guideTitle;
    private String emergencyType;
    private String description;
    private String immediateSteps;
    private String requiredMaterials;
    private String doNotActions;
    private String whenToSeekVet;
    private String imageUrl;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
