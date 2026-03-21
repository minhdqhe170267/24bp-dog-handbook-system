package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.ApprovalRecord;
import vn.edu.fpt.doghandbook.backend.entity.enums.ApprovableEntityType;

import java.util.List;

public interface ApprovalRecordRepository extends JpaRepository<ApprovalRecord, Integer> {

    List<ApprovalRecord> findByEntityTypeAndEntityIdOrderByReviewedAtDesc(
            ApprovableEntityType entityType, Integer entityId);

    Page<ApprovalRecord> findByReviewerUserIdOrderByReviewedAtDesc(
            Integer reviewerId, Pageable pageable);
}
