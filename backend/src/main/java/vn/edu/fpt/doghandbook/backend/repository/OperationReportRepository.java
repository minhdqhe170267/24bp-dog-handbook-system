package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;

import java.util.Optional;

public interface OperationReportRepository extends JpaRepository<OperationReport, Integer> {

    Page<OperationReport> findByIsDeletedFalseOrderByReportDateDesc(Pageable pageable);

    Page<OperationReport> findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(Integer trainerId, Pageable pageable);

    Page<OperationReport> findByDogProfileDogIdAndIsDeletedFalseOrderByReportDateDesc(Integer dogId, Pageable pageable);

    Optional<OperationReport> findByReportIdAndIsDeletedFalse(Integer id);
}
