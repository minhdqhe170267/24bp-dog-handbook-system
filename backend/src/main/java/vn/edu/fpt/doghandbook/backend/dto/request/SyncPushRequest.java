package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncActionType;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class SyncPushRequest {

    @NotBlank(message = "Loại entity không được để trống")
    @Size(max = 50, message = "Loại entity tối đa 50 ký tự")
    private String entityType;

    private Integer entityId;

    @NotBlank(message = "Loại hành động không được để trống")
    @ValidEnum(enumClass = SyncActionType.class, message = "Loại hành động không hợp lệ")
    private String actionType;

    @Size(max = 50000, message = "Dữ liệu payload tối đa 50000 ký tự")
    private String payloadData;
}
