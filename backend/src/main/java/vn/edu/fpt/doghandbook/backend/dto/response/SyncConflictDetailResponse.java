package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SyncConflictDetailResponse {

    private Integer id;
    private String entityType;
    private Integer entityId;
    private String localId;
    private Map<String, Object> localData;
    private Map<String, Object> serverData;
    private Map<String, Object> mergedData;
    private String status;
    private String resolutionType;
    private String trainerName;
    private String serverModifiedBy;
    private LocalDateTime conflictDetectedAt;
    private LocalDateTime resolvedAt;
    private String resolvedByName;
    private String resolutionNote;
    private List<String> conflictedFields;
}
