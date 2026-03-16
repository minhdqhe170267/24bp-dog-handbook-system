package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SyncPushRequest {

    @NotBlank
    private String entityType;

    private Integer entityId;

    @NotBlank
    private String actionType;

    private String payloadData;
}
