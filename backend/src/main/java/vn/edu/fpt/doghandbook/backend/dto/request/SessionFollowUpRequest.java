package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class SessionFollowUpRequest {

    @NotNull
    private Integer sessionId;

    @NotBlank
    private String statusUpdate;

    private String notes;

    private BigDecimal weightKg;

    private BigDecimal temperatureC;

    private String nextAction;
}
