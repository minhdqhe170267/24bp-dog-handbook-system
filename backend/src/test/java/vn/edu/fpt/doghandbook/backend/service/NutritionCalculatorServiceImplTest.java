package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionCalculateRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.NutritionCalculateResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.NutritionCalculatorServiceImpl;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NutritionCalculatorServiceImplTest {

    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;

    @InjectMocks
    private NutritionCalculatorServiceImpl calculatorService;

    private DogBreed breed;

    @BeforeEach
    void setUp() {
        breed = DogBreed.builder()
                .breedId(1)
                .breedName("German Shepherd")
                .weightMaleMinKg(new BigDecimal("30.00"))
                .weightMaleMaxKg(new BigDecimal("40.00"))
                .weightFemaleMinKg(new BigDecimal("22.00"))
                .weightFemaleMaxKg(new BigDecimal("32.00"))
                .build();
    }

    private NutritionCalculateRequest buildRequest(Integer breedId, String weightKg,
                                                    Integer ageMonths, String activityLevel,
                                                    String gender) {
        NutritionCalculateRequest req = new NutritionCalculateRequest();
        req.setBreedId(breedId);
        req.setWeightKg(weightKg != null ? new BigDecimal(weightKg) : null);
        req.setAgeMonths(ageMonths);
        req.setActivityLevel(activityLevel);
        req.setGender(gender);
        return req;
    }

    // ========================================================================
    // calculate - happy paths
    // ========================================================================
    @Nested
    class HappyPath {

        @Test
        void normalWeight_male_mediumActivity_adult_returnsNormalStatus() {
            NutritionCalculateRequest req = buildRequest(1, "35.0", 24, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
            assertThat(result.getDeviationPercent()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getDailyCalories()).isNotNull();
            assertThat(result.getProteinG()).isNotNull();
            assertThat(result.getFatG()).isNotNull();
            assertThat(result.getCarbG()).isNotNull();
            assertThat(result.getFormula()).contains("70");
            assertThat(result.getSuggestedRation()).isNull();
        }

        @Test
        void normalWeight_female_returnsNormal() {
            NutritionCalculateRequest req = buildRequest(1, "27.0", 24, "LOW", "FEMALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.LOW), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
        }

        @Test
        void matchingStandard_returnsSuggestedRation() {
            NutritionCalculateRequest req = buildRequest(1, "35.0", 24, "HIGH", "MALE");

            NutritionStandard standard = NutritionStandard.builder()
                    .standardId(50)
                    .rationCode("RC050")
                    .rationName("High Activity Adult")
                    .build();

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.HIGH), eq(24)))
                    .thenReturn(List.of(standard));

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getSuggestedRation()).isNotNull();
            assertThat(result.getSuggestedRation().getStandardId()).isEqualTo(50);
            assertThat(result.getSuggestedRation().getRationCode()).isEqualTo("RC050");
        }

        @Test
        void puppyAge_appendsPuppyMealAdvice() {
            NutritionCalculateRequest req = buildRequest(1, "10.0", 6, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(6)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getRecommendation()).contains("3-4");
        }

        @Test
        void seniorAge_appendsSeniorAdvice() {
            NutritionCalculateRequest req = buildRequest(1, "35.0", 96, "LOW", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.LOW), eq(96)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getRecommendation()).contains("2-3");
        }
    }

    // ========================================================================
    // calculate - weight status categories
    // ========================================================================
    @Nested
    class WeightStatusCategories {

        @Test
        void underweightDog_returnsUnderweight() {
            NutritionCalculateRequest req = buildRequest(1, "20.0", 24, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("UNDERWEIGHT");
            assertThat(result.getDeviationPercent()).isNegative();
            assertThat(result.getRecommendation()).contains("15%");
        }

        @Test
        void overweightDog_returnsOverweight() {
            NutritionCalculateRequest req = buildRequest(1, "50.0", 24, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("OVERWEIGHT");
            assertThat(result.getDeviationPercent()).isPositive();
            assertThat(result.getRecommendation()).contains("15%");
        }

        @Test
        void exactMinWeight_returnsNormal() {
            NutritionCalculateRequest req = buildRequest(1, "30.0", 24, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
        }

        @Test
        void exactMaxWeight_returnsNormal() {
            NutritionCalculateRequest req = buildRequest(1, "40.0", 24, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse result = calculatorService.calculate(req);

            assertThat(result.getWeightStatus()).isEqualTo("NORMAL");
        }
    }

    // ========================================================================
    // calculate - activity level multipliers
    // ========================================================================
    @Nested
    class ActivityLevels {

        @Test
        void veryHighActivity_producesHigherCalories() {
            NutritionCalculateRequest reqHigh = buildRequest(1, "35.0", 24, "VERY_HIGH", "MALE");
            NutritionCalculateRequest reqLow = buildRequest(1, "35.0", 24, "LOW", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), any(), eq(24)))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse resultHigh = calculatorService.calculate(reqHigh);
            NutritionCalculateResponse resultLow = calculatorService.calculate(reqLow);

            assertThat(resultHigh.getDailyCalories()).isGreaterThan(resultLow.getDailyCalories());
        }
    }

    // ========================================================================
    // calculate - age factor boundaries
    // ========================================================================
    @Nested
    class AgeFactor {

        @Test
        void age4Months_usesHighestFactor() {
            NutritionCalculateRequest req4 = buildRequest(1, "10.0", 4, "MEDIUM", "MALE");
            NutritionCalculateRequest req5 = buildRequest(1, "10.0", 5, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), any()))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse res4 = calculatorService.calculate(req4);
            NutritionCalculateResponse res5 = calculatorService.calculate(req5);

            assertThat(res4.getDailyCalories()).isGreaterThan(res5.getDailyCalories());
        }

        @Test
        void age84Months_usesAdultFactor() {
            NutritionCalculateRequest req84 = buildRequest(1, "35.0", 84, "MEDIUM", "MALE");
            NutritionCalculateRequest req85 = buildRequest(1, "35.0", 85, "MEDIUM", "MALE");

            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));
            when(nutritionStandardRepository.findMatchingStandards(eq(1), eq(ActivityLevel.MEDIUM), any()))
                    .thenReturn(Collections.emptyList());

            NutritionCalculateResponse res84 = calculatorService.calculate(req84);
            NutritionCalculateResponse res85 = calculatorService.calculate(req85);

            assertThat(res84.getDailyCalories()).isGreaterThan(res85.getDailyCalories());
        }
    }

    // ========================================================================
    // calculate - error cases
    // ========================================================================
    @Nested
    class ErrorCases {

        @Test
        void breedNotFound_throwsBadRequest() {
            NutritionCalculateRequest req = buildRequest(999, "35.0", 24, "MEDIUM", "MALE");
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> calculatorService.calculate(req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void invalidActivityLevel_throwsBadRequest() {
            NutritionCalculateRequest req = buildRequest(1, "35.0", 24, "EXTREME", "MALE");
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));

            assertThatThrownBy(() -> calculatorService.calculate(req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void nullActivityLevel_throwsBadRequest() {
            NutritionCalculateRequest req = buildRequest(1, "35.0", 24, null, "MALE");
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1)).thenReturn(Optional.of(breed));

            assertThatThrownBy(() -> calculatorService.calculate(req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void breedWithNullWeightStandards_throwsBadRequest() {
            DogBreed breedNoWeight = DogBreed.builder()
                    .breedId(2)
                    .breedName("Unknown Breed")
                    .weightMaleMinKg(null)
                    .weightMaleMaxKg(null)
                    .build();
            NutritionCalculateRequest req = buildRequest(2, "35.0", 24, "MEDIUM", "MALE");
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(2)).thenReturn(Optional.of(breedNoWeight));

            assertThatThrownBy(() -> calculatorService.calculate(req))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        void breedWithZeroWeightStandards_throwsBadRequest() {
            DogBreed breedZeroWeight = DogBreed.builder()
                    .breedId(3)
                    .breedName("Zero Weight Breed")
                    .weightMaleMinKg(BigDecimal.ZERO)
                    .weightMaleMaxKg(BigDecimal.ZERO)
                    .build();
            NutritionCalculateRequest req = buildRequest(3, "35.0", 24, "MEDIUM", "MALE");
            when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(3)).thenReturn(Optional.of(breedZeroWeight));

            assertThatThrownBy(() -> calculatorService.calculate(req))
                    .isInstanceOf(BadRequestException.class);
        }
    }
}
