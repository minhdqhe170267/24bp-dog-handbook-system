package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionRationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionStandardResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionRation;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.repository.NutritionRationRepository;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Nutrition service implementation.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionServiceImpl implements NutritionService {

    private final NutritionRationRepository nutritionRationRepository;

    @Override
    public List<NutritionRationResponse> getRationsByBreed(Long breedId, Integer ageMonths, Double weightKg) {
        if (breedId == null) {
            return Collections.emptyList();
        }

        return nutritionRationRepository.findByBreedAndOptionalRanges(breedId, ageMonths, weightKg)
                .stream()
                .map(this::toRationResponse)
                .collect(Collectors.toList());
    }

    private NutritionRationResponse toRationResponse(NutritionRation ration) {
        NutritionStandard standard = ration.getNutritionStandard();
        DogBreed breed = ration.getDogBreed();

        return NutritionRationResponse.builder()
                .id(ration.getId())
                .breedId(breed != null ? breed.getId() : null)
                .breedName(breed != null ? breed.getName() : null)
                .dailyFoodGram(ration.getDailyFoodGram())
                .note(ration.getNote())
                .standard(toStandardResponse(standard))
                .build();
    }

    private NutritionStandardResponse toStandardResponse(NutritionStandard standard) {
        if (standard == null) {
            return null;
        }

        return NutritionStandardResponse.builder()
                .id(standard.getId())
                .code(standard.getCode())
                .description(standard.getDescription())
                .minWeight(standard.getMinWeight())
                .maxWeight(standard.getMaxWeight())
                .minAgeMonth(standard.getMinAgeMonth())
                .maxAgeMonth(standard.getMaxAgeMonth())
                .build();
    }
}
