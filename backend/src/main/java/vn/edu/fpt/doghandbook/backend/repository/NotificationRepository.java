package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.Notification;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Integer recipientId, Pageable pageable);

    long countByRecipientUserIdAndIsReadFalse(Integer recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.notificationId = :id AND n.recipient.userId = :userId")
    int markAsRead(@Param("id") Long notificationId, @Param("userId") Integer userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.userId = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") Integer userId);

    List<Notification> findByRecipientRoleAndCreatedAtAfterOrderByCreatedAtDesc(
            UserRole recipientRole, LocalDateTime since);

    List<Notification> findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(
            Integer recipientId, LocalDateTime since);

    // Escalation: count sync conflicts per user in recent period
    long countByRecipientUserIdAndTypeAndCreatedAtAfter(
            Integer recipientId, NotificationType type, LocalDateTime since);
}
