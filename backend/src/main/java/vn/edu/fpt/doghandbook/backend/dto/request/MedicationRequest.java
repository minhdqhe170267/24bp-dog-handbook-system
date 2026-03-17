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
public class MedicationRequest {

    @NotBlank(message = "medicationName is required")
    @Size(max = 200, message = "medicationName must not exceed 200 characters")
    private String medicationName;

    @Size(max = 5000, message = "description must not exceed 5000 characters")
    private String description;

    @Size(max = 5000, message = "dosageInstructions must not exceed 5000 characters")
    private String dosageInstructions;

    @Size(max = 200, message = "administrationMethod must not exceed 200 characters")
    private String administrationMethod;

    @Size(max = 5000, message = "sideEffects must not exceed 5000 characters")
    private String sideEffects;

    @Size(max = 5000, message = "contraindications must not exceed 5000 characters")
    private String contraindications;

    @Size(max = 5000, message = "storageRequirements must not exceed 5000 characters")
    private String storageRequirements;

    @Size(max = 500, message = "imageUrl must not exceed 500 characters")
    private String imageUrl;

    @ValidEnum(enumClass = ContentStatus.class, message = "status không hợp lệ")
    private String status;
}
