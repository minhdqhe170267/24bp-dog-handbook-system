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
public class MedicationResponse {

    private Integer medicationId;
    private String medicationName;
    private String description;
    private String dosageInstructions;
    private String administrationMethod;
    private String sideEffects;
    private String contraindications;
    private String storageRequirements;
    private String imageUrl;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
