package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.HealthSession;

import java.util.Optional;

public interface HealthSessionRepository extends JpaRepository<HealthSession, Integer> {

    Page<HealthSession> findByTrainer_UserIdOrderByStartedAtDesc(Integer trainerId, Pageable pageable);

    Page<HealthSession> findByDogProfile_DogIdOrderByStartedAtDesc(Integer dogId, Pageable pageable);

    Optional<HealthSession> findBySessionId(Integer sessionId);
}
