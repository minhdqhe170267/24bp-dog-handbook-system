package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SessionFollowUp;

import java.util.List;
import java.util.Optional;

public interface SessionFollowUpRepository extends JpaRepository<SessionFollowUp, Integer> {

    List<SessionFollowUp> findByHealthSession_SessionIdOrderByFollowupDateDesc(Integer sessionId);

    Optional<SessionFollowUp> findByLocalId(String localId);
}
