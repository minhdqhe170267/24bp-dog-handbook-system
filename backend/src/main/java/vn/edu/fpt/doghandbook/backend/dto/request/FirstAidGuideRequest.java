package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirstAidGuideRequest {

    @NotBlank(message = "guideTitle is required")
    private String guideTitle;

    @NotBlank(message = "emergencyType is required")
    private String emergencyType;

    private String description;

    @NotBlank(message = "immediateSteps is required")
    private String immediateSteps;

    private String requiredMaterials;
    private String doNotActions;
    private String whenToSeekVet;
    private String imageUrl;
}
