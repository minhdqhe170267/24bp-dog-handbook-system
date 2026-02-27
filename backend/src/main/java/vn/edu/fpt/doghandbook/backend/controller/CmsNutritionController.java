package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionRationUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;

/**
 * REST endpoints for CMS nutrition management.
 */
@RestController
@RequestMapping("/api/cms/nutrition")
@RequiredArgsConstructor
public class CmsNutritionController {

    private final NutritionService nutritionService;

    @GetMapping("/standards")
    public ResponseEntity<List<NutritionStandardResponse>> getStandards(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "activityLevel", required = false) String activityLevel,
            @RequestParam(value = "status", required = false) String status) {

        return ResponseEntity.ok(nutritionService.getCmsNutritionStandards(keyword, activityLevel, status));
    }

    @PostMapping("/standards")
    public ResponseEntity<NutritionStandardResponse> createStandard(
            @Valid @RequestBody NutritionStandardRequest request) {
        return ResponseEntity.ok(nutritionService.createNutritionStandard(request));
    }

    @PutMapping("/standards/{standardId}")
    public ResponseEntity<NutritionStandardResponse> updateStandard(
            @PathVariable("standardId") Long standardId,
            @Valid @RequestBody NutritionStandardRequest request) {
        return ResponseEntity.ok(nutritionService.updateNutritionStandard(standardId, request));
    }

    @DeleteMapping("/standards/{standardId}")
    public ResponseEntity<Void> deleteStandard(@PathVariable("standardId") Long standardId) {
        nutritionService.deleteNutritionStandard(standardId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/rations")
    public ResponseEntity<List<NutritionRationResponse>> getRations(
            @RequestParam("standardId") Long standardId) {
        return ResponseEntity.ok(nutritionService.getCmsNutritionRations(standardId));
    }

    @PostMapping("/rations")
    public ResponseEntity<NutritionRationResponse> createRation(
            @Valid @RequestBody NutritionRationUpsertRequest request) {
        return ResponseEntity.ok(nutritionService.createNutritionRation(request));
    }

    @PutMapping("/rations/{rationId}")
    public ResponseEntity<NutritionRationResponse> updateRation(
            @PathVariable("rationId") Long rationId,
            @Valid @RequestBody NutritionRationUpsertRequest request) {
        return ResponseEntity.ok(nutritionService.updateNutritionRation(rationId, request));
    }

    @DeleteMapping("/rations/{rationId}")
    public ResponseEntity<Void> deleteRation(@PathVariable("rationId") Long rationId) {
        nutritionService.deleteNutritionRation(rationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/calculator/verify")
    public ResponseEntity<NutritionCalculateResponse> calculateNutrition(
            @Valid @RequestBody NutritionCalculateRequest request) {
        return ResponseEntity.ok(nutritionService.calculateNutrition(request));
    }
}
