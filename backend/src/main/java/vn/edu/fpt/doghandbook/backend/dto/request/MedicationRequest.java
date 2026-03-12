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
public class MedicationRequest {

    @NotBlank(message = "medicationName is required")
    private String medicationName;

    private String description;
    private String dosageInstructions;
    private String administrationMethod;
    private String sideEffects;
    private String contraindications;
    private String storageRequirements;
    private String imageUrl;
}
