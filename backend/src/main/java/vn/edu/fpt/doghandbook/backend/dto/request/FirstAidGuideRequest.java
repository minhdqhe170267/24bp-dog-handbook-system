package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(max = 200, message = "guideTitle must not exceed 200 characters")
    private String guideTitle;

    @NotBlank(message = "emergencyType is required")
    @Size(max = 100, message = "emergencyType must not exceed 100 characters")
    private String emergencyType;

    private String description;

    @NotBlank(message = "immediateSteps is required")
    private String immediateSteps;

    private String requiredMaterials;
    private String doNotActions;
    private String whenToSeekVet;
    private String imageUrl;
    private String status;
}
