package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculatorVerifyRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionRationUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardUpsertRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculatorVerifyResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;

import java.util.List;

/**
 * Nutrition module service contract.
 */
public interface NutritionService {

    /**
     * Get nutrition rations by dog breed for trainer/mobile use.
     */
    List<NutritionRationResponse> getRationsByBreed(Long breedId);

    /**
     * Get nutrition rations by nutrition standard for trainer/mobile use.
     */
    List<NutritionRationResponse> getRationsByStandard(Long standardId);

    /**
     * Search published nutrition standards for trainer/mobile.
     */
    List<NutritionStandardResponse> getNutritionStandards(
            String keyword,
            String activityLevel,
            Double weightKg,
            Integer ageMonths
    );

    /**
     * Get one published nutrition standard for trainer/mobile.
     */
    NutritionStandardResponse getNutritionStandard(Long standardId);

    /**
     * Get one published nutrition standard and its ration list for trainer/mobile.
     */
    List<NutritionRationResponse> getNutritionStandardRations(Long standardId);

    /**
     * Search standards for CMS management.
     */
    List<NutritionStandardResponse> getCmsNutritionStandards(String keyword, String activityLevel, String status);

    /**
     * Create a nutrition standard (CMS).
     */
    NutritionStandardResponse createNutritionStandard(NutritionStandardUpsertRequest request);

    /**
     * Update a nutrition standard (CMS).
     */
    NutritionStandardResponse updateNutritionStandard(Long standardId, NutritionStandardUpsertRequest request);

    /**
     * Soft-delete a nutrition standard (CMS).
     */
    void deleteNutritionStandard(Long standardId);

    /**
     * Get ration items of one standard for CMS management.
     */
    List<NutritionRationResponse> getCmsNutritionRations(Long standardId);

    /**
     * Create a nutrition ration item (CMS).
     */
    NutritionRationResponse createNutritionRation(NutritionRationUpsertRequest request);

    /**
     * Update a nutrition ration item (CMS).
     */
    NutritionRationResponse updateNutritionRation(Long rationId, NutritionRationUpsertRequest request);

    /**
     * Soft-delete a nutrition ration item (CMS).
     */
    void deleteNutritionRation(Long rationId);

    /**
     * Optional calculator verification endpoint for web-admin.
     */
    NutritionCalculatorVerifyResponse verifyNutritionCalculation(NutritionCalculatorVerifyRequest request);
}
