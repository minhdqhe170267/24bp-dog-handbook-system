package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.NotificationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Notification;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.NotificationRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void notifyUser(User recipient, User sender, NotificationType type,
                           String title, String message, String entityType, Integer entityId) {
        Set<Integer> deliveredUserIds = new HashSet<>();

        createAndDispatchNotification(recipient, null, sender, type, title, message, entityType, entityId);
        deliveredUserIds.add(recipient.getUserId());

        notifyAllAdmins(sender, type, title, message, entityType, entityId, deliveredUserIds);
    }

    @Override
    public void notifyRole(UserRole role, User sender, NotificationType type,
                           String title, String message, String entityType, Integer entityId) {
        Set<Integer> deliveredUserIds = new HashSet<>();

        List<User> recipients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == role && Boolean.TRUE.equals(u.getIsActive())
                        && !Boolean.TRUE.equals(u.getIsDeleted()))
                .filter(u -> sender == null || !u.getUserId().equals(sender.getUserId()))
                .toList();

        for (User recipient : recipients) {
            createAndDispatchNotification(recipient, role, sender, type, title, message, entityType, entityId);
            deliveredUserIds.add(recipient.getUserId());
        }

        notifyAllAdmins(sender, type, title, message, entityType, entityId, deliveredUserIds);
    }

    private void createAndDispatchNotification(User recipient, UserRole recipientRole, User sender,
                                               NotificationType type, String title, String message,
                                               String entityType, Integer entityId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .recipientRole(recipientRole)
                .sender(sender)
                .type(type)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .build();

        notification = notificationRepository.save(notification);

        NotificationResponse response = toResponse(notification);
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipient.getUserId(), response);
    }

    private void notifyAllAdmins(User sender, NotificationType type, String title, String message,
                                 String entityType, Integer entityId, Set<Integer> deliveredUserIds) {
        Integer senderId = sender != null ? sender.getUserId() : null;

        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN
                        && Boolean.TRUE.equals(u.getIsActive())
                        && !Boolean.TRUE.equals(u.getIsDeleted()))
                .filter(u -> !u.getUserId().equals(senderId))
                .filter(u -> !deliveredUserIds.contains(u.getUserId()))
                .toList();

        for (User admin : admins) {
            createAndDispatchNotification(admin, null, sender, type, title, message, entityType, entityId);
            deliveredUserIds.add(admin.getUserId());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> entityPage = notificationRepository
                .findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);

        Page<NotificationResponse> dtoPage = entityPage.map(this::toResponse);
        return PageResponse.<NotificationResponse>builder()
                .content(dtoPage.getContent())
                .page(dtoPage.getNumber())
                .size(dtoPage.getSize())
                .totalElements(dtoPage.getTotalElements())
                .totalPages(dtoPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Integer userId) {
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Override
    public void markAsRead(Long notificationId, Integer userId) {
        notificationRepository.markAsRead(notificationId, userId);
    }

    @Override
    public void markAllAsRead(Integer userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsSince(Integer userId, LocalDateTime since) {
        return notificationRepository
                .findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(userId, since)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public void deleteNotification(Long notificationId, Integer userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thông báo"));
        if (!notification.getRecipient().getUserId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền xóa thông báo này");
        }
        notificationRepository.delete(notification);
    }

    private NotificationResponse toResponse(Notification notification) {
        User sender = notification.getSender();
        return NotificationResponse.builder()
                .notificationId(notification.getNotificationId())
                .senderId(safeUserId(sender))
                .senderName(safeUserName(sender))
                .type(notification.getType() != null ? notification.getType().name() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .entityType(notification.getEntityType())
                .entityId(notification.getEntityId())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private Integer safeUserId(User user) {
        if (user == null) return null;
        try { return user.getUserId(); } catch (EntityNotFoundException e) { return null; }
    }

    private String safeUserName(User user) {
        if (user == null) return null;
        try { return user.getFullName(); } catch (EntityNotFoundException e) { return null; }
    }
}
