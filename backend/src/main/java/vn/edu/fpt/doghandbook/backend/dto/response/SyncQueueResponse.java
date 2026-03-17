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
public class SyncQueueResponse {

    private Integer queueId;
    private Integer userId;
    private String entityType;
    private Integer entityId;
    private String actionType;
    private String syncStatus;
    private Integer retryCount;
    private String errorMessage;
    private LocalDateTime queuedAt;
    private LocalDateTime syncedAt;
}
