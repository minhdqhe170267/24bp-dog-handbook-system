package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SymptomResponse;
import vn.edu.fpt.doghandbook.backend.service.SymptomService;

import java.util.List;

@RestController
@RequestMapping("/symptoms")
@RequiredArgsConstructor
public class SymptomController {

    private final SymptomService symptomService;

    @GetMapping
    public ApiResponse<List<SymptomResponse>> getAllSymptoms() {
        return ApiResponse.success(symptomService.getAll());
    }

    @GetMapping("/by-category")
    public ApiResponse<List<SymptomResponse>> getByCategory(@RequestParam String category) {
        return ApiResponse.success(symptomService.getByCategory(category));
    }
}
