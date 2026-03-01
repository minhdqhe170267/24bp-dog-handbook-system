package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingMethodRequest {

    @NotBlank
    private String methodName;

    private String description;
    private String advantages;
    private String disadvantages;
    private String instructions;
}
