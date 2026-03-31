package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SyncConflictLog;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;

import java.util.List;
import java.util.Optional;

public interface SyncConflictLogRepository extends JpaRepository<SyncConflictLog, Integer> {

    List<SyncConflictLog> findByStatusOrderByConflictDetectedAtDesc(ConflictStatus status);

    Page<SyncConflictLog> findByStatusOrderByConflictDetectedAtDesc(ConflictStatus status, Pageable pageable);

    List<SyncConflictLog> findByEntityTypeAndEntityId(String entityType, Integer entityId);

    List<SyncConflictLog> findByTrainerIdAndStatus(Integer trainerId, ConflictStatus status);

    long countByStatus(ConflictStatus status);

    Optional<SyncConflictLog> findByLocalIdAndStatus(String localId, ConflictStatus status);
}
