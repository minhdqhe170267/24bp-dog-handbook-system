package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SessionFollowUp;

public interface SessionFollowUpRepository extends JpaRepository<SessionFollowUp, Integer> {
}
