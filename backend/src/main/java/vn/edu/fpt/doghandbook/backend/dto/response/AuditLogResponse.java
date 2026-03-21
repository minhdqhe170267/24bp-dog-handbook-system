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
public class AuditLogResponse {

    private Long logId;
    private Integer userId;
    private String username;
    private String fullName;
    private String actionType;
    private String entityType;
    private Integer entityId;
    private String description;
    private String oldValues;
    private String newValues;
    private String ipAddress;
    private LocalDateTime actionTimestamp;
}
