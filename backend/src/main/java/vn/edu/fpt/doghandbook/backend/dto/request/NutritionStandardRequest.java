package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NutritionStandardRequest {

    @NotBlank
    private String rationCode;

    @NotBlank
    private String rationName;

    private String description;

    private Integer breedId;

    private Integer targetAgeMinMonths;

    private Integer targetAgeMaxMonths;

    @NotNull
    private String activityLevel;

    private String healthCondition = "NORMAL";

    private String metadata;

    private String specialNotes;
}
