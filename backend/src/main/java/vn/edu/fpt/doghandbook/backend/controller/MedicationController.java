package vn.edu.fpt.doghandbook.backend.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/medications")
public class MedicationController {

    @GetMapping
    public ApiResponse<?> getAllMedications() {
        List<Map<String, Object>> medications = List.of(
                Map.of("medicationId", 1, "medicationName", "Amoxicillin",
                        "administrationRoute", "Uống", "dosage", "20mg/kg",
                        "description", "Kháng sinh phổ rộng, điều trị nhiễm khuẩn",
                        "status", "PUBLISHED"),
                Map.of("medicationId", 2, "medicationName", "Dexamethasone",
                        "administrationRoute", "Tiêm", "dosage", "0.1mg/kg",
                        "description", "Corticosteroid, chống viêm và dị ứng",
                        "status", "PUBLISHED")
        );
        return ApiResponse.success(PageResponse.builder()
                .content(medications)
                .page(0).size(10).totalElements(2).totalPages(1)
                .build());
    }
}
