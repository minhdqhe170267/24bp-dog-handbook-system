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
public class SystemSettingResponse {

    private Integer settingId;
    private String settingKey;
    private String settingValue;
    private String defaultValue;
    private String settingGroup;
    private String dataType;
    private String description;
    private LocalDateTime updatedAt;
}
