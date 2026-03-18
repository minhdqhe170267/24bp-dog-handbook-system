package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.HealthRecord;

import java.util.List;
import java.util.Optional;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, Integer> {

    Page<HealthRecord> findByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(Integer dogId, Pageable pageable);

    List<HealthRecord> findTop10ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(Integer dogId);

    List<HealthRecord> findTop3ByDogProfile_DogIdAndIsDeletedFalseOrderByExaminationDateDesc(Integer dogId);

    Page<HealthRecord> findByIsDeletedFalseOrderByExaminationDateDesc(Pageable pageable);

    Optional<HealthRecord> findByRecordIdAndIsDeletedFalse(Integer recordId);

    Optional<HealthRecord> findByLocalId(String localId);
}
