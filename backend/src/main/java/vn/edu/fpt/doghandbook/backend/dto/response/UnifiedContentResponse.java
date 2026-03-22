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
public class UnifiedContentResponse {

    private Integer entityId;
    private String entityType;
    private String title;
    private String description;
    private String status;
    private String authorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
