package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BreedResponse {

    private Integer breedId;
    private String breedName;
    private String origin;
    private String description;
    private String sizeClassification;
    private BigDecimal weightMaleMinKg;
    private BigDecimal weightMaleMaxKg;
    private BigDecimal weightFemaleMinKg;
    private BigDecimal weightFemaleMaxKg;
    private BigDecimal avgHeightCm;
    private String lifespanYears;
    private String trainabilityLevel;
    private String operationalCapabilities;
    private String metadata;
    private String imageUrl;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
