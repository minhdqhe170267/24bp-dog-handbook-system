package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;

/**
 * REST endpoints for trainer/mobile nutrition module.
 */
@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService nutritionService;

    /**
     * Lookup nutrition rations by breed or standard.
     *
     * @param breedId    dog breed id
     * @param standardId nutrition standard id
     * @return list of rations (empty when no match)
     */
    @GetMapping("/rations")
    public ResponseEntity<List<NutritionRationResponse>> getRations(
            @RequestParam(value = "breedId", required = false) Long breedId,
            @RequestParam(value = "standardId", required = false) Long standardId) {

        if (breedId != null && standardId != null) {
            throw new IllegalArgumentException("Use either breedId or standardId, not both");
        }
        if (breedId == null && standardId == null) {
            throw new IllegalArgumentException("Either breedId or standardId is required");
        }

        if (standardId != null) {
            return ResponseEntity.ok(nutritionService.getRationsByStandard(standardId));
        }
        return ResponseEntity.ok(nutritionService.getRationsByBreed(breedId));
    }

    /**
     * Get published nutrition standards with optional filters.
     *
     * @return list of standards (empty when no row)
     */
    @GetMapping("/standards")
    public ResponseEntity<List<NutritionStandardResponse>> getNutritionStandards(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "activityLevel", required = false) String activityLevel,
            @RequestParam(value = "weightKg", required = false) Double weightKg,
            @RequestParam(value = "ageMonths", required = false) Integer ageMonths) {

        return ResponseEntity.ok(
                nutritionService.getNutritionStandards(keyword, activityLevel, weightKg, ageMonths)
        );
    }

    /**
     * Get one published nutrition standard by id.
     */
    @GetMapping("/standards/{standardId}")
    public ResponseEntity<NutritionStandardResponse> getNutritionStandard(
            @PathVariable("standardId") Long standardId) {
        return ResponseEntity.ok(nutritionService.getNutritionStandard(standardId));
    }

    /**
     * Get published ration list for a standard.
     */
    @GetMapping("/standards/{standardId}/rations")
    public ResponseEntity<List<NutritionRationResponse>> getNutritionStandardRations(
            @PathVariable("standardId") Long standardId) {
        return ResponseEntity.ok(nutritionService.getNutritionStandardRations(standardId));
    }
}
