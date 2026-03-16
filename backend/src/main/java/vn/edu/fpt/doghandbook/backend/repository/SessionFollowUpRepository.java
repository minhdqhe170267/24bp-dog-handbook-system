package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SessionFollowUp;

import java.util.List;

public interface SessionFollowUpRepository extends JpaRepository<SessionFollowUp, Integer> {

    List<SessionFollowUp> findByHealthSession_SessionIdOrderByFollowupDateDesc(Integer sessionId);
}
