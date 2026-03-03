package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, Integer> {
}
