package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DiagnosisRecord;

import java.util.Optional;

public interface DiagnosisRecordRepository extends JpaRepository<DiagnosisRecord, Integer> {

    Optional<DiagnosisRecord> findByLocalId(String localId);
}
