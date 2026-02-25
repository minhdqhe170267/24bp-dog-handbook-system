package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/diseases")
public class DiseaseController {

    @GetMapping
    public ApiResponse<?> getAllDiseases() {
        List<Map<String, Object>> diseases = List.of(
                Map.of("diseaseId", 1, "diseaseName", "Parvo",
                        "severityLevel", "CRITICAL", "isContagious", true, "status", "PUBLISHED"),
                Map.of("diseaseId", 2, "diseaseName", "Viêm dạ dày ruột",
                        "severityLevel", "MEDIUM", "isContagious", false, "status", "PUBLISHED"),
                Map.of("diseaseId", 3, "diseaseName", "Viêm da",
                        "severityLevel", "LOW", "isContagious", false, "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(diseases)
                .page(0).size(10).totalElements(3).totalPages(1)
                .build());
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getDiseaseById(@PathVariable int id) {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("diseaseId", 1),
                Map.entry("diseaseName", "Parvo (Bệnh viêm ruột tiểu cầu)"),
                Map.entry("description", "Bệnh truyền nhiễm nguy hiểm do virus Parvovirus gây ra, tỷ lệ tử vong cao nếu không điều trị kịp thời"),
                Map.entry("symptomSummary", "Nôn mửa, tiêu chảy có máu, mất nước, bỏ ăn, sốt cao"),
                Map.entry("treatmentGuidelines", "Truyền dịch IV, kháng sinh ngăn nhiễm khuẩn thứ phát, thuốc chống nôn"),
                Map.entry("preventionMeasures", "Tiêm phòng đầy đủ vaccine Parvo, vệ sinh chuồng trại định kỳ"),
                Map.entry("severityLevel", "CRITICAL"),
                Map.entry("isContagious", true),
                Map.entry("incubationPeriod", "3-7 ngày"),
                Map.entry("status", "PUBLISHED"),
                Map.entry("symptoms", List.of(
                        Map.of("symptomId", 1, "symptomName", "Nôn", "weight", 0.9, "isPrimary", true),
                        Map.of("symptomId", 3, "symptomName", "Tiêu chảy", "weight", 0.85, "isPrimary", true),
                        Map.of("symptomId", 4, "symptomName", "Sốt", "weight", 0.7, "isPrimary", false)
                ))
        ));
    }
}
