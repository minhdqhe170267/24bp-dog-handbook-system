package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BreedRequest {

    @NotBlank
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
}
