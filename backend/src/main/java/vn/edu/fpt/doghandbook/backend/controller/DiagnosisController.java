package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/diagnosis")
public class DiagnosisController {

    @PostMapping("/check-symptoms")
    public ApiResponse<?> checkSymptoms(@RequestBody Map<String, Object> request) {
        return ApiResponse.success(Map.of(
                "results", List.of(
                        Map.of("diseaseId", 1, "diseaseName", "Parvo",
                                "matchScore", 85.5, "severityLevel", "CRITICAL"),
                        Map.of("diseaseId", 2, "diseaseName", "Viêm dạ dày",
                                "matchScore", 45.0, "severityLevel", "MEDIUM")
                ),
                "totalSymptomsChecked", 3
        ));
    }
}
