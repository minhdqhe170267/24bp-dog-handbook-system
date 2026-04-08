package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.NotificationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationService {

    void notifyUser(User recipient, User sender, NotificationType type,
                    String title, String message, String entityType, Integer entityId);

    void notifyRole(UserRole role, User sender, NotificationType type,
                    String title, String message, String entityType, Integer entityId);

    PageResponse<NotificationResponse> getNotifications(Integer userId, int page, int size);

    long getUnreadCount(Integer userId);

    void markAsRead(Long notificationId, Integer userId);

    void markAllAsRead(Integer userId);

    List<NotificationResponse> getNotificationsSince(Integer userId, LocalDateTime since);

    void deleteNotification(Long notificationId, Integer userId);
}
