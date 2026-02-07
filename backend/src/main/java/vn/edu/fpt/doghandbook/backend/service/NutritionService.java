package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;

import java.util.List;

/**
 * Nutrition module service contract.
 */
public interface NutritionService {

    /**
     * Get nutrition rations by dog breed with optional filters.
     *
     * @param breedId   dog breed id (required)
     * @param ageMonths dog age in months (optional)
     * @param weightKg  dog weight in kg (optional)
     * @return list of rations; empty when no match
     */
    List<NutritionRationResponse> getRationsByBreed(Long breedId, Integer ageMonths, Double weightKg);
}
