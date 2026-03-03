package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/symptoms")
public class SymptomController {

    @GetMapping
    public ApiResponse<?> getAllSymptoms() {
        return ApiResponse.success(List.of(
                Map.of("symptomId", 1, "symptomCode", "SYM-001", "symptomName", "Nôn",
                        "category", "EATING", "severityIndicator", 3),
                Map.of("symptomId", 2, "symptomCode", "SYM-002", "symptomName", "Bỏ ăn",
                        "category", "EATING", "severityIndicator", 2),
                Map.of("symptomId", 3, "symptomCode", "SYM-003", "symptomName", "Tiêu chảy",
                        "category", "PHYSICAL", "severityIndicator", 3),
                Map.of("symptomId", 4, "symptomCode", "SYM-004", "symptomName", "Sốt",
                        "category", "PHYSICAL", "severityIndicator", 4),
                Map.of("symptomId", 5, "symptomCode", "SYM-005", "symptomName", "Lờ đờ",
                        "category", "BEHAVIOR", "severityIndicator", 2),
                Map.of("symptomId", 6, "symptomCode", "SYM-006", "symptomName", "Ngứa nhiều",
                        "category", "SKIN", "severityIndicator", 2)
        ));
    }
}
