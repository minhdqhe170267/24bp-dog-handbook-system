package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports")
public class ReportController {

    @GetMapping
    public ApiResponse<?> getAllReports() {
        List<Map<String, Object>> reports = List.of(
                Map.of("reportId", 1, "reportName", "Báo cáo huấn luyện tuần 8",
                        "reportType", "TRAINING", "reportDate", "2026-02-24",
                        "trainerId", 1, "trainerName", "Nguyễn Văn Kiên",
                        "status", "SUBMITTED"),
                Map.of("reportId", 2, "reportName", "Báo cáo sức khỏe tháng 2",
                        "reportType", "HEALTH", "reportDate", "2026-02-25",
                        "trainerId", 1, "trainerName", "Nguyễn Văn Kiên",
                        "status", "DRAFT")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(reports)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
