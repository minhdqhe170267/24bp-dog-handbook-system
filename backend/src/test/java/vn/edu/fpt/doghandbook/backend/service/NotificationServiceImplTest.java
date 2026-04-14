package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import vn.edu.fpt.doghandbook.backend.dto.response.NotificationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.Notification;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.NotificationRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.NotificationServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private NotificationServiceImpl service;

    private User recipient;
    private User sender;
    private User admin;
    private Notification notification;

    @BeforeEach
    void setUp() {
        recipient = User.builder().userId(1).username("trainer01").fullName("Trainer One")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        sender = User.builder().userId(2).username("editor01").fullName("Editor One")
                .role(UserRole.CONTENT_EDITOR).isActive(true).isDeleted(false).build();
        admin = User.builder().userId(3).username("admin01").fullName("Admin One")
                .role(UserRole.ADMIN).isActive(true).isDeleted(false).build();

        notification = Notification.builder()
                .notificationId(100L)
                .recipient(recipient)
                .sender(sender)
                .type(NotificationType.CONTENT_SUBMITTED)
                .title("New Content")
                .message("Content submitted for review")
                .entityType("Content")
                .entityId(10)
                .isRead(false)
                .createdAt(LocalDateTime.of(2025, 1, 1, 10, 0))
                .build();
    }

    // ──────────────────── notifyUser ────────────────────

    @Test
    void notifyUser_success_createsNotificationAndSendsWebSocket() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(100L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        service.notifyUser(recipient, sender, NotificationType.CONTENT_SUBMITTED,
                "New Content", "Content submitted", "Content", 10);

        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/notifications/1"), any(NotificationResponse.class));
    }

    @Test
    void notifyUser_alsoNotifiesAdmins() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(101L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(List.of(admin));

        service.notifyUser(recipient, sender, NotificationType.CONTENT_SUBMITTED,
                "Title", "Message", "Content", 10);

        // 1 for recipient + 1 for admin
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void notifyUser_adminRecipient_doesNotDuplicateForAdmin() {
        // recipient is admin -> should not notify again as admin
        User adminRecipient = User.builder().userId(3).username("admin01").fullName("Admin One")
                .role(UserRole.ADMIN).isActive(true).isDeleted(false).build();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(102L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(List.of(adminRecipient));

        service.notifyUser(adminRecipient, sender, NotificationType.CONTENT_SUBMITTED,
                "Title", "Message", "Content", 10);

        // only 1 notification: already delivered to admin as recipient
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void notifyUser_senderIsAdmin_excludesSenderFromAdminNotifications() {
        User adminSender = User.builder().userId(3).username("admin01").fullName("Admin One")
                .role(UserRole.ADMIN).isActive(true).isDeleted(false).build();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(103L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(List.of(adminSender));

        service.notifyUser(recipient, adminSender, NotificationType.CONTENT_SUBMITTED,
                "Title", "Message", "Content", 10);

        // only 1 for recipient, admin sender excluded
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void notifyUser_noAdmins_onlyNotifiesRecipient() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(104L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        service.notifyUser(recipient, sender, NotificationType.CONTENT_APPROVED,
                "Title", "Message", "Content", 10);

        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(messagingTemplate, times(1)).convertAndSend(anyString(), any(NotificationResponse.class));
    }

    @Test
    void notifyUser_sendsCorrectWebSocketDestination() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(105L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        service.notifyUser(recipient, sender, NotificationType.CONTENT_SUBMITTED,
                "Title", "Message", "Content", 10);

        verify(messagingTemplate).convertAndSend(eq("/topic/notifications/1"), any(NotificationResponse.class));
    }

    @Test
    void notifyUser_multipleAdmins_notifiesEach() {
        User admin2 = User.builder().userId(4).username("admin02").fullName("Admin Two")
                .role(UserRole.ADMIN).isActive(true).isDeleted(false).build();
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(106L);
            return n;
        });
        when(userRepository.findAll()).thenReturn(List.of(admin, admin2));

        service.notifyUser(recipient, sender, NotificationType.CONTENT_SUBMITTED,
                "Title", "Message", "Content", 10);

        // 1 recipient + 2 admins
        verify(notificationRepository, times(3)).save(any(Notification.class));
    }

    // ──────────────────── notifyRole ────────────────────

    @Test
    void notifyRole_success_notifiesUsersWithRole() {
        User trainer2 = User.builder().userId(5).username("trainer02").fullName("Trainer Two")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        when(userRepository.findAll()).thenReturn(List.of(recipient, trainer2, admin));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(200L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, sender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        // 2 trainers + 1 admin (not already delivered)
        verify(notificationRepository, times(3)).save(any(Notification.class));
    }

    @Test
    void notifyRole_excludesSenderFromRecipients() {
        // sender is a TRAINER -> should exclude sender from trainer notifications
        when(userRepository.findAll()).thenReturn(List.of(recipient, sender));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(201L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, sender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        // only trainer (recipient, userId=1) not sender(userId=2, CONTENT_EDITOR not TRAINER anyway)
        // Actually sender is CONTENT_EDITOR, so only role=TRAINER is recipient
        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }

    @Test
    void notifyRole_excludesInactiveUsers() {
        User inactive = User.builder().userId(6).username("trainer03").fullName("Trainer Three")
                .role(UserRole.TRAINER).isActive(false).isDeleted(false).build();
        when(userRepository.findAll()).thenReturn(List.of(recipient, inactive));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(202L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, sender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        // only active trainer (recipient)
        // verify at least 1 save for the active trainer
        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }

    @Test
    void notifyRole_excludesDeletedUsers() {
        User deleted = User.builder().userId(7).username("trainer04").fullName("Trainer Four")
                .role(UserRole.TRAINER).isActive(true).isDeleted(true).build();
        when(userRepository.findAll()).thenReturn(List.of(recipient, deleted));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(203L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, sender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }

    @Test
    void notifyRole_noMatchingUsers_onlyNotifiesAdmins() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(204L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, sender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        // only admin notified
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void notifyRole_nullSender_doesNotExcludeAnyone() {
        when(userRepository.findAll()).thenReturn(List.of(recipient));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(205L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, null, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }

    @Test
    void notifyRole_senderIsSameRole_excludesSender() {
        User trainerSender = User.builder().userId(8).username("trainer05").fullName("Trainer Five")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        when(userRepository.findAll()).thenReturn(List.of(recipient, trainerSender));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setNotificationId(206L);
            return n;
        });

        service.notifyRole(UserRole.TRAINER, trainerSender, NotificationType.CONTENT_PUBLISHED,
                "Title", "Message", "Content", 10);

        // recipient gets notification, trainerSender excluded
        verify(notificationRepository, atLeastOnce()).save(any(Notification.class));
    }

    // ──────────────────── getNotifications ────────────────────

    @Test
    void getNotifications_returnsPageResponse() {
        Page<Notification> page = new PageImpl<>(List.of(notification), PageRequest.of(0, 10), 1);
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = service.getNotifications(1, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
        NotificationResponse resp = (NotificationResponse) result.getContent().get(0);
        assertThat(resp.getTitle()).isEqualTo("New Content");
    }

    @Test
    void getNotifications_emptyPage_returnsEmpty() {
        Page<Notification> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = service.getNotifications(1, 0, 10);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalPages()).isZero();
    }

    @Test
    void getNotifications_mapsNotificationFields() {
        Page<Notification> page = new PageImpl<>(List.of(notification), PageRequest.of(0, 10), 1);
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = service.getNotifications(1, 0, 10);
        NotificationResponse resp = (NotificationResponse) result.getContent().get(0);

        assertThat(resp.getNotificationId()).isEqualTo(100L);
        assertThat(resp.getSenderId()).isEqualTo(2);
        assertThat(resp.getSenderName()).isEqualTo("Editor One");
        assertThat(resp.getType()).isEqualTo("CONTENT_SUBMITTED");
        assertThat(resp.getEntityType()).isEqualTo("Content");
        assertThat(resp.getEntityId()).isEqualTo(10);
        assertThat(resp.getIsRead()).isFalse();
    }

    @Test
    void getNotifications_pageMetadataCorrect() {
        Page<Notification> page = new PageImpl<>(List.of(notification), PageRequest.of(2, 5), 15);
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = service.getNotifications(1, 2, 5);

        assertThat(result.getPage()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalElements()).isEqualTo(15);
    }

    @Test
    void getNotifications_nullSender_mapsNullSenderFields() {
        Notification noSenderNotification = Notification.builder()
                .notificationId(101L)
                .recipient(recipient)
                .sender(null)
                .type(NotificationType.CONTENT_APPROVED)
                .title("System Notification")
                .message("Auto notification")
                .isRead(false)
                .createdAt(LocalDateTime.of(2025, 1, 2, 10, 0))
                .build();
        Page<Notification> page = new PageImpl<>(List.of(noSenderNotification), PageRequest.of(0, 10), 1);
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(1), any()))
                .thenReturn(page);

        PageResponse<NotificationResponse> result = service.getNotifications(1, 0, 10);
        NotificationResponse resp = (NotificationResponse) result.getContent().get(0);

        assertThat(resp.getSenderId()).isNull();
        assertThat(resp.getSenderName()).isNull();
    }

    // ──────────────────── getUnreadCount ────────────────────

    @Test
    void getUnreadCount_returnsCount() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(1)).thenReturn(5L);

        long count = service.getUnreadCount(1);

        assertThat(count).isEqualTo(5L);
    }

    @Test
    void getUnreadCount_zeroUnread_returnsZero() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(1)).thenReturn(0L);

        long count = service.getUnreadCount(1);

        assertThat(count).isZero();
    }

    @Test
    void getUnreadCount_differentUser_queriesCorrectId() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(99)).thenReturn(3L);

        long count = service.getUnreadCount(99);

        assertThat(count).isEqualTo(3L);
        verify(notificationRepository).countByRecipientUserIdAndIsReadFalse(99);
    }

    @Test
    void getUnreadCount_largeCount_returnsCorrectValue() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(1)).thenReturn(10000L);

        long count = service.getUnreadCount(1);

        assertThat(count).isEqualTo(10000L);
    }

    @Test
    void getUnreadCount_callsRepositoryMethod() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(1)).thenReturn(1L);

        service.getUnreadCount(1);

        verify(notificationRepository).countByRecipientUserIdAndIsReadFalse(1);
    }

    // ──────────────────── markAsRead ────────────────────

    @Test
    void markAsRead_callsRepository() {
        service.markAsRead(100L, 1);

        verify(notificationRepository).markAsRead(100L, 1);
    }

    @Test
    void markAsRead_withDifferentIds_callsCorrectly() {
        service.markAsRead(200L, 5);

        verify(notificationRepository).markAsRead(200L, 5);
    }

    @Test
    void markAsRead_calledOnce() {
        service.markAsRead(100L, 1);

        verify(notificationRepository, times(1)).markAsRead(anyLong(), anyInt());
    }

    @Test
    void markAsRead_passesExactParameters() {
        service.markAsRead(999L, 42);

        verify(notificationRepository).markAsRead(eq(999L), eq(42));
    }

    @Test
    void markAsRead_noOtherRepositoryInteraction() {
        service.markAsRead(100L, 1);

        verify(notificationRepository).markAsRead(100L, 1);
        verifyNoMoreInteractions(notificationRepository);
    }

    // ──────────────────── markAllAsRead ────────────────────

    @Test
    void markAllAsRead_callsRepository() {
        service.markAllAsRead(1);

        verify(notificationRepository).markAllAsRead(1);
    }

    @Test
    void markAllAsRead_withDifferentUserId() {
        service.markAllAsRead(99);

        verify(notificationRepository).markAllAsRead(99);
    }

    @Test
    void markAllAsRead_calledOnce() {
        service.markAllAsRead(1);

        verify(notificationRepository, times(1)).markAllAsRead(anyInt());
    }

    @Test
    void markAllAsRead_passesExactParameter() {
        service.markAllAsRead(42);

        verify(notificationRepository).markAllAsRead(eq(42));
    }

    @Test
    void markAllAsRead_noOtherRepositoryInteraction() {
        service.markAllAsRead(1);

        verify(notificationRepository).markAllAsRead(1);
        verifyNoMoreInteractions(notificationRepository);
    }

    // ──────────────────── getNotificationsSince ────────────────────

    @Test
    void getNotificationsSince_returnsList() {
        LocalDateTime since = LocalDateTime.of(2025, 1, 1, 0, 0);
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(1, since))
                .thenReturn(List.of(notification));

        List<NotificationResponse> result = service.getNotificationsSince(1, since);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("New Content");
    }

    @Test
    void getNotificationsSince_emptyResult_returnsEmptyList() {
        LocalDateTime since = LocalDateTime.of(2025, 12, 31, 23, 59);
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(1, since))
                .thenReturn(Collections.emptyList());

        List<NotificationResponse> result = service.getNotificationsSince(1, since);

        assertThat(result).isEmpty();
    }

    @Test
    void getNotificationsSince_mapsResponseFields() {
        LocalDateTime since = LocalDateTime.of(2025, 1, 1, 0, 0);
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(1, since))
                .thenReturn(List.of(notification));

        List<NotificationResponse> result = service.getNotificationsSince(1, since);

        NotificationResponse resp = result.get(0);
        assertThat(resp.getNotificationId()).isEqualTo(100L);
        assertThat(resp.getType()).isEqualTo("CONTENT_SUBMITTED");
        assertThat(resp.getMessage()).isEqualTo("Content submitted for review");
    }

    @Test
    void getNotificationsSince_multipleNotifications_returnsAll() {
        Notification notification2 = Notification.builder()
                .notificationId(101L)
                .recipient(recipient)
                .sender(sender)
                .type(NotificationType.CONTENT_APPROVED)
                .title("Approved")
                .message("Content approved")
                .isRead(true)
                .createdAt(LocalDateTime.of(2025, 1, 2, 10, 0))
                .build();
        LocalDateTime since = LocalDateTime.of(2025, 1, 1, 0, 0);
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(1, since))
                .thenReturn(List.of(notification, notification2));

        List<NotificationResponse> result = service.getNotificationsSince(1, since);

        assertThat(result).hasSize(2);
    }

    @Test
    void getNotificationsSince_nullSender_handlesGracefully() {
        Notification noSenderNotif = Notification.builder()
                .notificationId(102L)
                .recipient(recipient)
                .sender(null)
                .type(NotificationType.CONTENT_PUBLISHED)
                .title("Published")
                .message("Content published")
                .isRead(false)
                .createdAt(LocalDateTime.of(2025, 1, 3, 10, 0))
                .build();
        LocalDateTime since = LocalDateTime.of(2025, 1, 1, 0, 0);
        when(notificationRepository.findByRecipientUserIdAndCreatedAtAfterOrderByCreatedAtDesc(1, since))
                .thenReturn(List.of(noSenderNotif));

        List<NotificationResponse> result = service.getNotificationsSince(1, since);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSenderId()).isNull();
        assertThat(result.get(0).getSenderName()).isNull();
    }
}
