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
public class SyncConflictListResponse {

    private Integer id;
    private String entityType;
    private Integer entityId;
    private String localId;
    private String status;
    private String trainerName;
    private LocalDateTime conflictDetectedAt;
    private int conflictedFieldCount;
}
