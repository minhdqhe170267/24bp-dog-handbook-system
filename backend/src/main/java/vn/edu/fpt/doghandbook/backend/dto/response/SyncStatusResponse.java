package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SyncStatusResponse {

    private Integer totalPending;
    private Integer totalCompleted;
    private Integer totalFailed;
    private Integer totalConflict;
    private LocalDateTime lastSyncAt;
    private List<SyncQueueResponse> pendingItems;
}
