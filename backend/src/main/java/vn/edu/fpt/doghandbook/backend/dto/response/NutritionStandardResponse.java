package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class NutritionStandardResponse {

    private Integer standardId;
    private String rationCode;
    private String rationName;
    private String description;
    private Integer breedId;
    private String breedName;
    private Integer targetAgeMinMonths;
    private Integer targetAgeMaxMonths;
    private String activityLevel;
    private String healthCondition;
    private String metadata;
    private String specialNotes;
    private String status;
    private String createdByName;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
}
