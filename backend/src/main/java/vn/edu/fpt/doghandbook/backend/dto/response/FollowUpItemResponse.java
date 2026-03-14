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
public class FollowUpItemResponse {

    private Integer followupId;
    private LocalDateTime followupDate;
    private String statusUpdate;
    private String notes;
    private BigDecimal weightKg;
    private BigDecimal temperatureC;
    private String nextAction;
}
