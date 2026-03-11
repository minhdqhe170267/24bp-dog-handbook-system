package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaResponse {

    private Integer mediaId;
    private String fileName;
    private String fileUrl;
    private String mediaType;
    private Long fileSizeBytes;
    private String mimeType;
    private String altText;
    private Integer displayOrder;
    private String entityType;
    private Integer entityId;
    private String uploadedByName;
    private LocalDateTime createdAt;
}
