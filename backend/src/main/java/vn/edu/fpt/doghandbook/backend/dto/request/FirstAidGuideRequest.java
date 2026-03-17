package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

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

    @Size(max = 5000, message = "description must not exceed 5000 characters")
    private String description;

    @NotBlank(message = "immediateSteps is required")
    @Size(max = 5000, message = "immediateSteps must not exceed 5000 characters")
    private String immediateSteps;

    @Size(max = 5000, message = "requiredMaterials must not exceed 5000 characters")
    private String requiredMaterials;

    @Size(max = 5000, message = "doNotActions must not exceed 5000 characters")
    private String doNotActions;

    @Size(max = 5000, message = "whenToSeekVet must not exceed 5000 characters")
    private String whenToSeekVet;

    @Size(max = 500, message = "imageUrl must not exceed 500 characters")
    private String imageUrl;

    @ValidEnum(enumClass = ContentStatus.class, message = "status không hợp lệ")
    private String status;
}
