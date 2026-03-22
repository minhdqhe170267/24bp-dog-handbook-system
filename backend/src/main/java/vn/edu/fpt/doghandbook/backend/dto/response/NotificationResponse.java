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
public class NotificationResponse {

    private Long notificationId;
    private Integer senderId;
    private String senderName;
    private String type;
    private String title;
    private String message;
    private String entityType;
    private Integer entityId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
