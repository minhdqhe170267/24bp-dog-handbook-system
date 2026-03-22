package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.HealthSession;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface HealthSessionRepository extends JpaRepository<HealthSession, Integer> {

    Page<HealthSession> findByTrainer_UserIdOrderByStartedAtDesc(Integer trainerId, Pageable pageable);

    Page<HealthSession> findByDogProfile_DogIdOrderByStartedAtDesc(Integer dogId, Pageable pageable);

    Optional<HealthSession> findBySessionId(Integer sessionId);

    Optional<HealthSession> findByLocalId(String localId);

    List<HealthSession> findByStatusAndFollowUpDateLessThanEqual(SessionStatus status, LocalDate date);

    // Escalation: sessions ACTIVE with HIGH severity, or ACTIVE longer than startedAt threshold
    List<HealthSession> findByStatusAndSeverity(SessionStatus status, SessionSeverity severity);

    List<HealthSession> findByStatusAndStartedAtBefore(SessionStatus status, LocalDateTime threshold);
}
