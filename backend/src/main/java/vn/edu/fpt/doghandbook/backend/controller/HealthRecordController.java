package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dogs/{dogId}/health-records")
public class HealthRecordController {

    @GetMapping
    public ApiResponse<?> getHealthRecords(@PathVariable int dogId) {
        List<Map<String, Object>> records = List.of(
                Map.of("recordId", 1, "dogId", dogId, "recordDate", "2026-02-10",
                        "weightKg", 34.5, "temperature", 38.5,
                        "diagnosis", "NORMAL", "notes", "Sức khỏe tốt, cân nặng ổn định"),
                Map.of("recordId", 2, "dogId", dogId, "recordDate", "2026-01-15",
                        "weightKg", 34.0, "temperature", 39.1,
                        "diagnosis", "Viêm dạ dày nhẹ", "notes", "Điều trị 3 ngày, đã hồi phục")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(records)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }

    @PostMapping
    public ApiResponse<?> createHealthRecord(@PathVariable int dogId,
                                              @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>(request);
        response.put("recordId", 99);
        response.put("dogId", dogId);
        return ApiResponse.success(response, "Tạo hồ sơ sức khỏe thành công");
    }
}
