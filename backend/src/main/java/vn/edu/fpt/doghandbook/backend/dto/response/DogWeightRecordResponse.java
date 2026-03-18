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
public class DogWeightRecordResponse {

    private Integer assessmentId;
    private String localId;
    private Integer dogId;
    private String dogName;
    private String dogCode;
    private Integer assessorId;
    private String assessorName;
    private BigDecimal recordedWeightKg;
    private BigDecimal standardMinKg;
    private BigDecimal standardMaxKg;
    private String status;
    private BigDecimal deviationPercent;
    private String recommendation;
    private Integer followUpWeeks;
    private LocalDateTime assessedAt;
    private LocalDateTime updatedAt;
}
