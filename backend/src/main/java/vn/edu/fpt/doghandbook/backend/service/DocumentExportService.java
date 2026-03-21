package vn.edu.fpt.doghandbook.backend.service;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

public interface DocumentExportService {

    ByteArrayInputStream exportExcel(String entityType, String search);

    ByteArrayInputStream exportPdf(String entityType, String search);

    ByteArrayInputStream exportTrainerReport(Integer trainerId, LocalDate from, LocalDate to, String reportType);

    ByteArrayInputStream exportUnitReport(LocalDate from, LocalDate to, String reportType);
}
