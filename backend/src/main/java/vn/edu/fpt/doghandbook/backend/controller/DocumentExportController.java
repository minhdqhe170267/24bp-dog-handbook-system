package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.service.DocumentExportService;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

@RestController
@RequestMapping("/export")
@RequiredArgsConstructor
public class DocumentExportController {

    private final DocumentExportService documentExportService;

    // ── Data Export (danh sách dữ liệu) ─────────────────────────────

    @GetMapping("/excel/{entityType}")
    public ResponseEntity<InputStreamResource> exportExcel(
            @PathVariable String entityType,
            @RequestParam(required = false) String search) {

        ByteArrayInputStream stream = documentExportService.exportExcel(entityType, search);
        String fileName = entityType.toLowerCase() + "_export.xlsx";

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/pdf/{entityType}")
    public ResponseEntity<InputStreamResource> exportPdf(
            @PathVariable String entityType,
            @RequestParam(required = false) String search) {

        ByteArrayInputStream stream = documentExportService.exportPdf(entityType, search);
        String fileName = entityType.toLowerCase() + "_export.pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(stream));
    }

    // ── Report Export (báo cáo tổng hợp) ────────────────────────────

    @GetMapping("/report/trainer/{trainerId}")
    public ResponseEntity<InputStreamResource> exportTrainerReport(
            @PathVariable Integer trainerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String reportType) {

        ByteArrayInputStream stream = documentExportService.exportTrainerReport(trainerId, from, to, reportType);
        String fileName = "report_trainer_" + trainerId + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/report/unit")
    public ResponseEntity<InputStreamResource> exportUnitReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String reportType) {

        ByteArrayInputStream stream = documentExportService.exportUnitReport(from, to, reportType);
        String fileName = "report_unit_" + LocalDate.now() + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName);

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(stream));
    }
}
