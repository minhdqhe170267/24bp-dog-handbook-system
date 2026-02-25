package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SyncQueue;

public interface SyncQueueRepository extends JpaRepository<SyncQueue, Integer> {
}
