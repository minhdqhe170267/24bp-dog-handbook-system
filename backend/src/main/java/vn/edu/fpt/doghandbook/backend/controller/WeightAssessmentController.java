package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.WeightAssessmentService;

@RestController
@RequestMapping("/weight-assessment")
@RequiredArgsConstructor
public class WeightAssessmentController {

    private final WeightAssessmentService weightAssessmentService;

    @GetMapping("/{dogId}")
    public ResponseEntity<ApiResponse<?>> assess(@PathVariable Integer dogId) {
        return ResponseEntity.ok(ApiResponse.success(weightAssessmentService.assess(dogId)));
    }
}
