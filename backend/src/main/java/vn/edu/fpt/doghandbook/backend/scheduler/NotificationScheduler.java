package vn.edu.fpt.doghandbook.backend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private static final int STALE_SESSION_DAYS = 7;
    private static final int OVERDUE_ESCALATION_DAYS = 3;
    private static final int SYNC_CONFLICT_THRESHOLD = 3;
    private static final int REASSIGNMENT_THRESHOLD = 3;
    private static final int REASSIGNMENT_WINDOW_DAYS = 30;

    private final HealthSessionRepository healthSessionRepository;
    private final NotificationRepository notificationRepository;
    private final DogAssignmentRepository dogAssignmentRepository;
    private final DogProfileRepository dogProfileRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ── Trainer-only: Follow-up due (7h sáng) ──

    @Scheduled(cron = "0 0 7 * * *")
    public void sendFollowUpDueReminders() {
        LocalDate today = LocalDate.now();
        List<HealthSession> dueSessions = healthSessionRepository
                .findByStatusAndFollowUpDateLessThanEqual(SessionStatus.ACTIVE, today);

        int trainerCount = 0;
        int escalationCount = 0;

        for (HealthSession session : dueSessions) {
            DogProfile dog = session.getDogProfile();
            boolean isOverdue = session.getFollowUpDate().isBefore(today);
            String prefix = isOverdue ? "Quá hạn follow-up: " : "Nhắc follow-up: ";

            // Trainer-only
            notificationService.notifyUser(
                    session.getTrainer(), null,
                    NotificationType.FOLLOWUP_DUE,
                    prefix + dog.getDogName(),
                    "Phiên sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                            + ") cần follow-up" + (isOverdue ? " (đã quá hạn)" : " hôm nay")
                            + " - " + session.getIssueSummary(),
                    "HEALTH_SESSION", session.getSessionId()
            );
            trainerCount++;

            // Escalation: overdue >= 3 days → notify Admin too
            long overdueDays = java.time.temporal.ChronoUnit.DAYS.between(session.getFollowUpDate(), today);
            if (overdueDays >= OVERDUE_ESCALATION_DAYS) {
                notificationService.notifyRole(
                        UserRole.ADMIN, null,
                        NotificationType.FOLLOWUP_OVERDUE_ESCALATION,
                        "Follow-up quá hạn " + overdueDays + " ngày: " + dog.getDogName(),
                        "Phiên sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                                + ") đã quá hạn follow-up " + overdueDays + " ngày mà chưa xử lý"
                                + " - Trainer: " + session.getTrainer().getFullName(),
                        "HEALTH_SESSION", session.getSessionId()
                );
                // Also notify trainer about escalation
                notificationService.notifyUser(
                        session.getTrainer(), null,
                        NotificationType.FOLLOWUP_OVERDUE_ESCALATION,
                        "Follow-up quá hạn " + overdueDays + " ngày: " + dog.getDogName(),
                        "Phiên sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                                + ") đã quá hạn follow-up " + overdueDays + " ngày. Vui lòng xử lý ngay.",
                        "HEALTH_SESSION", session.getSessionId()
                );
                escalationCount++;
            }
        }

        if (trainerCount > 0) {
            log.info("[SCHEDULER] Follow-up: {} reminders, {} escalations", trainerCount, escalationCount);
        }
    }

    // ── Trainer + Admin: Health session critical/stale (7h15 sáng) ──

    @Scheduled(cron = "0 15 7 * * *")
    public void checkCriticalHealthSessions() {
        int count = 0;

        // 1. HIGH severity sessions still ACTIVE
        List<HealthSession> highSeverity = healthSessionRepository
                .findByStatusAndSeverity(SessionStatus.ACTIVE, SessionSeverity.HIGH);

        for (HealthSession session : highSeverity) {
            DogProfile dog = session.getDogProfile();
            String title = "Phiên sức khỏe nghiêm trọng: " + dog.getDogName();
            String message = "Phiên sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                    + ") có mức nghiêm trọng CAO và chưa được xử lý"
                    + " - Trainer: " + session.getTrainer().getFullName();

            notificationService.notifyUser(
                    session.getTrainer(), null,
                    NotificationType.HEALTH_SESSION_CRITICAL,
                    title, message,
                    "HEALTH_SESSION", session.getSessionId()
            );
            notificationService.notifyRole(
                    UserRole.ADMIN, null,
                    NotificationType.HEALTH_SESSION_CRITICAL,
                    title, message,
                    "HEALTH_SESSION", session.getSessionId()
            );
            count++;
        }

        // 2. Sessions ACTIVE longer than STALE_SESSION_DAYS
        LocalDateTime staleThreshold = LocalDateTime.now().minusDays(STALE_SESSION_DAYS);
        List<HealthSession> staleSessions = healthSessionRepository
                .findByStatusAndStartedAtBefore(SessionStatus.ACTIVE, staleThreshold);

        for (HealthSession session : staleSessions) {
            // Skip if already notified above (HIGH severity)
            if (session.getSeverity() == SessionSeverity.HIGH) continue;

            DogProfile dog = session.getDogProfile();
            long days = java.time.temporal.ChronoUnit.DAYS.between(
                    session.getStartedAt().toLocalDate(), LocalDate.now());
            String title = "Phiên sức khỏe kéo dài " + days + " ngày: " + dog.getDogName();
            String message = "Phiên sức khỏe của " + dog.getDogName() + " (" + dog.getDogCode()
                    + ") đã mở " + days + " ngày chưa xử lý xong"
                    + " - Trainer: " + session.getTrainer().getFullName();

            notificationService.notifyUser(
                    session.getTrainer(), null,
                    NotificationType.HEALTH_SESSION_CRITICAL,
                    title, message,
                    "HEALTH_SESSION", session.getSessionId()
            );
            notificationService.notifyRole(
                    UserRole.ADMIN, null,
                    NotificationType.HEALTH_SESSION_CRITICAL,
                    title, message,
                    "HEALTH_SESSION", session.getSessionId()
            );
            count++;
        }

        if (count > 0) {
            log.info("[SCHEDULER] Critical/stale health sessions: {} alerts", count);
        }
    }

    // ── Trainer + Admin: Repeated sync conflicts (7h30 sáng) ──

    @Scheduled(cron = "0 30 7 * * *")
    public void checkRepeatedSyncConflicts() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        int count = 0;

        // Check all trainers
        List<User> trainers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.TRAINER
                        && Boolean.TRUE.equals(u.getIsActive())
                        && !Boolean.TRUE.equals(u.getIsDeleted()))
                .toList();

        for (User trainer : trainers) {
            long conflictCount = notificationRepository
                    .countByRecipientUserIdAndTypeAndCreatedAtAfter(
                            trainer.getUserId(), NotificationType.SYNC_CONFLICT, since);

            if (conflictCount >= SYNC_CONFLICT_THRESHOLD) {
                String title = "Xung đột sync lặp lại: " + trainer.getFullName();
                String message = trainer.getFullName() + " có " + conflictCount
                        + " lỗi xung đột đồng bộ trong 24h qua. Cần kiểm tra thiết bị hoặc dữ liệu.";

                notificationService.notifyUser(
                        trainer, null,
                        NotificationType.REPEATED_SYNC_FAILURE,
                        title, message, null, null
                );
                notificationService.notifyRole(
                        UserRole.ADMIN, null,
                        NotificationType.REPEATED_SYNC_FAILURE,
                        title, message, null, null
                );
                count++;
            }
        }

        if (count > 0) {
            log.info("[SCHEDULER] Repeated sync conflicts: {} trainers flagged", count);
        }
    }

    // ── Trainer + Admin: Abnormal reassignment (7h45 sáng) ──

    @Scheduled(cron = "0 45 7 * * *")
    public void checkAbnormalReassignment() {
        LocalDateTime since = LocalDateTime.now().minusDays(REASSIGNMENT_WINDOW_DAYS);
        List<Object[]> results = dogAssignmentRepository
                .findDogsWithFrequentReassignment(since, REASSIGNMENT_THRESHOLD);

        int count = 0;
        for (Object[] row : results) {
            Integer dogId = (Integer) row[0];
            Long assignmentCount = (Long) row[1];

            DogProfile dog = dogProfileRepository.findByDogIdAndIsDeletedFalse(dogId).orElse(null);
            if (dog == null) continue;

            String title = "Phân công bất thường: " + dog.getDogName();
            String message = dog.getDogName() + " (" + dog.getDogCode() + ") đã được phân công "
                    + assignmentCount + " lần trong " + REASSIGNMENT_WINDOW_DAYS + " ngày qua.";

            // Notify current trainers of this dog
            Set<Integer> notifiedIds = new HashSet<>();
            for (DogAssignment a : dogAssignmentRepository.findEffectiveByDogProfileDogId(dogId, LocalDate.now())) {
                notificationService.notifyUser(
                        a.getTrainer(), null,
                        NotificationType.ABNORMAL_REASSIGNMENT,
                        title, message,
                        "DOG_PROFILE", dogId
                );
                notifiedIds.add(a.getTrainer().getUserId());
            }

            // Notify Admin
            notificationService.notifyRole(
                    UserRole.ADMIN, null,
                    NotificationType.ABNORMAL_REASSIGNMENT,
                    title, message,
                    "DOG_PROFILE", dogId
            );
            count++;
        }

        if (count > 0) {
            log.info("[SCHEDULER] Abnormal reassignment: {} dogs flagged", count);
        }
    }
}
