package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
public class WeightAssessmentController {

    @PostMapping("/weight-assessment/evaluate")
    public ApiResponse<?> evaluate(@RequestBody Map<String, Object> request) {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("assessmentId", 10),
                Map.entry("dogName", "Rex"),
                Map.entry("breedName", "Berger Đức"),
                Map.entry("recordedWeightKg", 42.0),
                Map.entry("standardMinKg", 30.0),
                Map.entry("standardMaxKg", 40.0),
                Map.entry("status", "OVERWEIGHT"),
                Map.entry("deviationPercent", 5.0),
                Map.entry("recommendation", "Cân nặng vượt chuẩn 5%. Giảm khẩu phần 10%, tăng bài tập cardio."),
                Map.entry("followUpWeeks", 2)
        ));
    }

    @GetMapping("/dogs/{dogId}/weight-history")
    public ApiResponse<?> getWeightHistory(@PathVariable int dogId) {
        return ApiResponse.success(List.of(
                Map.of("date", "2026-02-25", "weightKg", 42.0, "status", "OVERWEIGHT"),
                Map.of("date", "2026-01-25", "weightKg", 38.5, "status", "NORMAL"),
                Map.of("date", "2025-12-25", "weightKg", 36.0, "status", "NORMAL")
        ));
    }
}
