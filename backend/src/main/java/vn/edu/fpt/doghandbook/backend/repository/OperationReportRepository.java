package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OperationReportRepository extends JpaRepository<OperationReport, Integer> {

    Page<OperationReport> findByIsDeletedFalseOrderByReportDateDesc(Pageable pageable);

    Page<OperationReport> findByReportTypeAndIsDeletedFalseOrderByReportDateDesc(ReportType reportType, Pageable pageable);

    Page<OperationReport> findByTrainerUserIdAndIsDeletedFalseOrderByReportDateDesc(Integer trainerId, Pageable pageable);

    Page<OperationReport> findByDogProfileDogIdAndIsDeletedFalseOrderByReportDateDesc(Integer dogId, Pageable pageable);

    Optional<OperationReport> findByReportIdAndIsDeletedFalse(Integer id);

    Optional<OperationReport> findByLocalId(String localId);

    // ── Report Export queries ───────────────────────────────────────

    List<OperationReport> findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
            Integer trainerId, LocalDate from, LocalDate to);

    List<OperationReport> findByTrainerUserIdAndReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByReportDateDesc(
            Integer trainerId, LocalDate from, LocalDate to, ReportType reportType);

    List<OperationReport> findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
            LocalDate from, LocalDate to);

    List<OperationReport> findByReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
            LocalDate from, LocalDate to, ReportType reportType);
}
