package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ApprovalRecordResponse {

    private Integer approvalId;
    private String entityType;
    private Integer entityId;
    private String entityTitle;
    private Integer reviewerId;
    private String reviewerName;
    private String decision;
    private String comments;
    private LocalDateTime reviewedAt;
}
