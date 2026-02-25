package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.ApprovalRecord;

public interface ApprovalRecordRepository extends JpaRepository<ApprovalRecord, Integer> {
}
