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
}
