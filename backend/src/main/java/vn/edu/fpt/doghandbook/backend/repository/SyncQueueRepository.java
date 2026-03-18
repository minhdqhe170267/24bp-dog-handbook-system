package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SyncQueue;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;

import java.util.List;
import java.util.Optional;

public interface SyncQueueRepository extends JpaRepository<SyncQueue, Integer> {

    List<SyncQueue> findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(Integer userId, SyncStatus syncStatus);

    List<SyncQueue> findByUserUserIdOrderByQueuedAtDesc(Integer userId);

    long countByUserUserIdAndSyncStatus(Integer userId, SyncStatus syncStatus);

    Optional<SyncQueue> findByLocalId(String localId);
}
