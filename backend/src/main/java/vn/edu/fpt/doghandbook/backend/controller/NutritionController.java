package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.List;

/**
 * REST endpoints for nutrition module (read-only for mobile).
 */
@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService nutritionService;

    /**
     * Lookup nutrition rations by dog breed.
     *
     * @param breedId   dog breed id (required)
     * @param ageMonths dog age in months (optional)
     * @param weightKg  dog weight in kg (optional)
     * @return list of rations (empty when no match)
     */
    @GetMapping("/rations")
    public ResponseEntity<List<NutritionRationResponse>> getRations(
            @RequestParam("breedId") Long breedId,
            @RequestParam(value = "ageMonths", required = false) Integer ageMonths,
            @RequestParam(value = "weightKg", required = false) Double weightKg
    ) {
        return ResponseEntity.ok(nutritionService.getRationsByBreed(breedId, ageMonths, weightKg));
    }
}
