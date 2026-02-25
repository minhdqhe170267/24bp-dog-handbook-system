package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;

public interface OperationReportRepository extends JpaRepository<OperationReport, Integer> {
}
