package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DiagnosisRecord;

public interface DiagnosisRecordRepository extends JpaRepository<DiagnosisRecord, Integer> {
}
