package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SystemSettingBatchRequest {

    @NotEmpty(message = "Danh sách cài đặt không được rỗng")
    private Map<String, String> settings;
}
