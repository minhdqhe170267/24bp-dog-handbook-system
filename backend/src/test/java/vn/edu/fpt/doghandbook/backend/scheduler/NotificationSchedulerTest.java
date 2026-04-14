package vn.edu.fpt.doghandbook.backend.scheduler;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.HealthSession;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.NotificationType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.DogAssignmentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthSessionRepository;
import vn.edu.fpt.doghandbook.backend.repository.NotificationRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

    @Mock
    private HealthSessionRepository healthSessionRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private DogAssignmentRepository dogAssignmentRepository;

    @Mock
    private DogProfileRepository dogProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private NotificationScheduler notificationScheduler;

    @Test
    void sendFollowUpDueReminders_dueSession_notifiesTrainerOnly() {
        User trainer = sampleTrainer(11, "Trainer Alpha");
        HealthSession session = sampleSession(101, trainer, LocalDate.now(), SessionSeverity.MEDIUM, 1);

        when(healthSessionRepository.findByStatusAndFollowUpDateLessThanEqual(eq(SessionStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(List.of(session));

        notificationScheduler.sendFollowUpDueReminders();

        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.FOLLOWUP_DUE),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(101)
        );
        verify(notificationService, never()).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.FOLLOWUP_OVERDUE_ESCALATION),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(101)
        );
    }

    @Test
    void sendFollowUpDueReminders_overdueSessionBeyondThreshold_notifiesTrainerAndAdminEscalation() {
        User trainer = sampleTrainer(12, "Trainer Bravo");
        HealthSession session = sampleSession(102, trainer, LocalDate.now().minusDays(3), SessionSeverity.MEDIUM, 2);

        when(healthSessionRepository.findByStatusAndFollowUpDateLessThanEqual(eq(SessionStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(List.of(session));

        notificationScheduler.sendFollowUpDueReminders();

        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.FOLLOWUP_DUE),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(102)
        );
        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.FOLLOWUP_OVERDUE_ESCALATION),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(102)
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.FOLLOWUP_OVERDUE_ESCALATION),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(102)
        );
    }

    @Test
    void sendFollowUpDueReminders_noDueSessions_sendsNothing() {
        when(healthSessionRepository.findByStatusAndFollowUpDateLessThanEqual(eq(SessionStatus.ACTIVE), any(LocalDate.class)))
                .thenReturn(List.of());

        notificationScheduler.sendFollowUpDueReminders();

        verify(notificationService, never()).notifyUser(any(), any(), any(), anyString(), anyString(), any(), any());
        verify(notificationService, never()).notifyRole(any(), any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void sendFollowUpDueReminders_repositoryFails_propagatesException() {
        when(healthSessionRepository.findByStatusAndFollowUpDateLessThanEqual(eq(SessionStatus.ACTIVE), any(LocalDate.class)))
                .thenThrow(new IllegalStateException("db down"));

        assertThatThrownBy(() -> notificationScheduler.sendFollowUpDueReminders())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("db down");
    }

    @Test
    void checkCriticalHealthSessions_highAndStaleSessions_notifiesTrainerAndAdmin() {
        User trainer = sampleTrainer(21, "Trainer Charlie");
        HealthSession highSeverity = sampleSession(201, trainer, LocalDate.now().plusDays(1), SessionSeverity.HIGH, 3);
        highSeverity.setStartedAt(LocalDateTime.now().minusDays(2));

        HealthSession staleMedium = sampleSession(202, trainer, LocalDate.now().plusDays(2), SessionSeverity.MEDIUM, 4);
        staleMedium.setStartedAt(LocalDateTime.now().minusDays(8));

        when(healthSessionRepository.findByStatusAndSeverity(SessionStatus.ACTIVE, SessionSeverity.HIGH))
                .thenReturn(List.of(highSeverity));
        when(healthSessionRepository.findByStatusAndStartedAtBefore(eq(SessionStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(List.of(staleMedium));

        notificationScheduler.checkCriticalHealthSessions();

        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(201)
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(201)
        );
        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(202)
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(202)
        );
    }

    @Test
    void checkCriticalHealthSessions_highSeveritySessionAlsoReturnedAsStale_skipsDuplicateStaleAlert() {
        User trainer = sampleTrainer(22, "Trainer Delta");
        HealthSession highSeverity = sampleSession(203, trainer, LocalDate.now().plusDays(1), SessionSeverity.HIGH, 5);
        highSeverity.setStartedAt(LocalDateTime.now().minusDays(9));

        when(healthSessionRepository.findByStatusAndSeverity(SessionStatus.ACTIVE, SessionSeverity.HIGH))
                .thenReturn(List.of(highSeverity));
        when(healthSessionRepository.findByStatusAndStartedAtBefore(eq(SessionStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(List.of(highSeverity));

        notificationScheduler.checkCriticalHealthSessions();

        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(203)
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.HEALTH_SESSION_CRITICAL),
                anyString(), anyString(),
                eq("HEALTH_SESSION"), eq(203)
        );
    }

    @Test
    void checkCriticalHealthSessions_noSessions_sendsNothing() {
        when(healthSessionRepository.findByStatusAndSeverity(SessionStatus.ACTIVE, SessionSeverity.HIGH))
                .thenReturn(List.of());
        when(healthSessionRepository.findByStatusAndStartedAtBefore(eq(SessionStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(List.of());

        notificationScheduler.checkCriticalHealthSessions();

        verify(notificationService, never()).notifyUser(any(), any(), any(), anyString(), anyString(), any(), any());
        verify(notificationService, never()).notifyRole(any(), any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void checkCriticalHealthSessions_repositoryFails_propagatesException() {
        when(healthSessionRepository.findByStatusAndSeverity(SessionStatus.ACTIVE, SessionSeverity.HIGH))
                .thenThrow(new IllegalStateException("health failure"));

        assertThatThrownBy(() -> notificationScheduler.checkCriticalHealthSessions())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("health failure");
    }

    @Test
    void checkRepeatedSyncConflicts_activeTrainerMeetingThreshold_notifiesTrainerAndAdmin() {
        User trainer = sampleTrainer(31, "Trainer Echo");
        User inactiveTrainer = sampleTrainer(32, "Trainer Foxtrot");
        inactiveTrainer.setIsActive(false);
        User admin = sampleAdmin(99, "Admin");

        when(userRepository.findAll()).thenReturn(List.of(trainer, inactiveTrainer, admin));
        when(notificationRepository.countByRecipientUserIdAndTypeAndCreatedAtAfter(
                eq(31), eq(NotificationType.SYNC_CONFLICT), any(LocalDateTime.class)))
                .thenReturn(3L);

        notificationScheduler.checkRepeatedSyncConflicts();

        verify(notificationService).notifyUser(
                eq(trainer), isNull(),
                eq(NotificationType.REPEATED_SYNC_FAILURE),
                anyString(), anyString(),
                isNull(), isNull()
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.REPEATED_SYNC_FAILURE),
                anyString(), anyString(),
                isNull(), isNull()
        );
        verify(notificationRepository, never()).countByRecipientUserIdAndTypeAndCreatedAtAfter(
                eq(32), eq(NotificationType.SYNC_CONFLICT), any(LocalDateTime.class));
    }

    @Test
    void checkRepeatedSyncConflicts_belowThresholdOrDeletedTrainer_skipsNotification() {
        User trainer = sampleTrainer(33, "Trainer Golf");
        User deletedTrainer = sampleTrainer(34, "Trainer Hotel");
        deletedTrainer.setIsDeleted(true);

        when(userRepository.findAll()).thenReturn(List.of(trainer, deletedTrainer));
        when(notificationRepository.countByRecipientUserIdAndTypeAndCreatedAtAfter(
                eq(33), eq(NotificationType.SYNC_CONFLICT), any(LocalDateTime.class)))
                .thenReturn(2L);

        notificationScheduler.checkRepeatedSyncConflicts();

        verify(notificationRepository, never()).countByRecipientUserIdAndTypeAndCreatedAtAfter(
                eq(34), eq(NotificationType.SYNC_CONFLICT), any(LocalDateTime.class));
        verify(notificationService, never()).notifyUser(any(), any(), any(), anyString(), anyString(), any(), any());
        verify(notificationService, never()).notifyRole(any(), any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void checkRepeatedSyncConflicts_repositoryFails_propagatesException() {
        when(userRepository.findAll()).thenThrow(new IllegalStateException("user failure"));

        assertThatThrownBy(() -> notificationScheduler.checkRepeatedSyncConflicts())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("user failure");
    }

    @Test
    void checkAbnormalReassignment_flaggedDog_notifiesCurrentTrainersAndAdmin() {
        User trainerOne = sampleTrainer(41, "Trainer India");
        User trainerTwo = sampleTrainer(42, "Trainer Juliet");
        DogProfile dog = sampleDog(8);

        DogAssignment assignmentOne = DogAssignment.builder()
                .assignmentId(501)
                .dogProfile(dog)
                .trainer(trainerOne)
                .startDate(LocalDate.now().minusDays(5))
                .build();
        DogAssignment assignmentTwo = DogAssignment.builder()
                .assignmentId(502)
                .dogProfile(dog)
                .trainer(trainerTwo)
                .startDate(LocalDate.now().minusDays(3))
                .build();

        when(dogAssignmentRepository.findDogsWithFrequentReassignment(any(LocalDateTime.class), eq(3L)))
                .thenReturn(List.<Object[]>of(new Object[]{8, 4L}));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(8)).thenReturn(Optional.of(dog));
        when(dogAssignmentRepository.findEffectiveByDogProfileDogId(eq(8), any(LocalDate.class)))
                .thenReturn(List.of(assignmentOne, assignmentTwo));

        notificationScheduler.checkAbnormalReassignment();

        verify(notificationService).notifyUser(
                eq(trainerOne), isNull(),
                eq(NotificationType.ABNORMAL_REASSIGNMENT),
                anyString(), anyString(),
                eq("DOG_PROFILE"), eq(8)
        );
        verify(notificationService).notifyUser(
                eq(trainerTwo), isNull(),
                eq(NotificationType.ABNORMAL_REASSIGNMENT),
                anyString(), anyString(),
                eq("DOG_PROFILE"), eq(8)
        );
        verify(notificationService).notifyRole(
                eq(UserRole.ADMIN), isNull(),
                eq(NotificationType.ABNORMAL_REASSIGNMENT),
                anyString(), anyString(),
                eq("DOG_PROFILE"), eq(8)
        );
    }

    @Test
    void checkAbnormalReassignment_missingDog_skipsNotification() {
        when(dogAssignmentRepository.findDogsWithFrequentReassignment(any(LocalDateTime.class), eq(3L)))
                .thenReturn(List.<Object[]>of(new Object[]{9, 5L}));
        when(dogProfileRepository.findByDogIdAndIsDeletedFalse(9)).thenReturn(Optional.empty());

        notificationScheduler.checkAbnormalReassignment();

        verify(dogAssignmentRepository, never()).findEffectiveByDogProfileDogId(eq(9), any(LocalDate.class));
        verify(notificationService, never()).notifyUser(any(), any(), any(), anyString(), anyString(), any(), any());
        verify(notificationService, never()).notifyRole(any(), any(), any(), anyString(), anyString(), any(), any());
    }

    @Test
    void checkAbnormalReassignment_repositoryFails_propagatesException() {
        when(dogAssignmentRepository.findDogsWithFrequentReassignment(any(LocalDateTime.class), eq(3L)))
                .thenThrow(new IllegalStateException("assignment failure"));

        assertThatThrownBy(() -> notificationScheduler.checkAbnormalReassignment())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("assignment failure");
    }

    private User sampleTrainer(Integer userId, String fullName) {
        return User.builder()
                .userId(userId)
                .username("trainer" + userId)
                .passwordHash("hash")
                .fullName(fullName)
                .role(UserRole.TRAINER)
                .isActive(true)
                .isDeleted(false)
                .build();
    }

    private User sampleAdmin(Integer userId, String fullName) {
        return User.builder()
                .userId(userId)
                .username("admin" + userId)
                .passwordHash("hash")
                .fullName(fullName)
                .role(UserRole.ADMIN)
                .isActive(true)
                .isDeleted(false)
                .build();
    }

    private DogProfile sampleDog(Integer dogId) {
        return DogProfile.builder()
                .dogId(dogId)
                .dogCode("DOG-" + dogId)
                .dogName("Dog " + dogId)
                .build();
    }

    private HealthSession sampleSession(
            Integer sessionId,
            User trainer,
            LocalDate followUpDate,
            SessionSeverity severity,
            Integer dogId
    ) {
        return HealthSession.builder()
                .sessionId(sessionId)
                .trainer(trainer)
                .dogProfile(sampleDog(dogId))
                .issueSummary("Issue " + sessionId)
                .status(SessionStatus.ACTIVE)
                .severity(severity)
                .startedAt(LocalDateTime.now().minusDays(1))
                .lastUpdateAt(LocalDateTime.now().minusHours(2))
                .followUpDate(followUpDate)
                .build();
    }
}
