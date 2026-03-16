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
public class MedicationRequest {

    @NotBlank(message = "medicationName is required")
    @Size(max = 200, message = "medicationName must not exceed 200 characters")
    private String medicationName;

    private String description;
    private String dosageInstructions;
    private String administrationMethod;
    private String sideEffects;
    private String contraindications;
    private String storageRequirements;
    private String imageUrl;
    private String status;
}
