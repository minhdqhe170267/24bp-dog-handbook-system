package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncPushItemResponse {

    private String localId;

    private Integer serverId;

    private String entityType;

    private String syncStatus; // SYNCED, CONFLICT, FAILED

    private Object serverData; // Khi CONFLICT — trả về server version để mobile resolve

    private String error; // Khi FAILED — mô tả lỗi

    public static SyncPushItemResponse synced(String localId, Integer serverId, String entityType) {
        return SyncPushItemResponse.builder()
                .localId(localId)
                .serverId(serverId)
                .entityType(entityType)
                .syncStatus("SYNCED")
                .build();
    }

    public static SyncPushItemResponse conflict(String localId, String entityType, Object serverData) {
        return SyncPushItemResponse.builder()
                .localId(localId)
                .entityType(entityType)
                .syncStatus("CONFLICT")
                .serverData(serverData)
                .build();
    }

    public static SyncPushItemResponse failed(String localId, String entityType, String error) {
        return SyncPushItemResponse.builder()
                .localId(localId)
                .entityType(entityType)
                .syncStatus("FAILED")
                .error(error)
                .build();
    }
}
