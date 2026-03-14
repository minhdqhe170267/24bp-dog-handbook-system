package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchHistoryResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchResultResponse;
import vn.edu.fpt.doghandbook.backend.entity.SearchHistory;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.SearchContext;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.SearchHistoryRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.SearchService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final DogBreedRepository dogBreedRepository;
    private final DiseaseRepository diseaseRepository;
    private final MedicationRepository medicationRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final NutritionStandardRepository nutritionStandardRepository;
    private final FirstAidGuideRepository firstAidGuideRepository;
    private final UserRepository userRepository;

    @Override
    public List<SearchResultResponse> search(String keyword, String context, Integer userId) {
        List<SearchResultResponse> results = new ArrayList<>();

        if (context == null || "BREED".equals(context)) {
            dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(breed -> results.add(SearchResultResponse.builder()
                            .entityType("BREED")
                            .entityId(breed.getBreedId())
                            .title(breed.getBreedName())
                            .description(truncate(breed.getDescription(), 200))
                            .build()));
        }

        if (context == null || "DISEASE".equals(context)) {
            diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(disease -> results.add(SearchResultResponse.builder()
                            .entityType("DISEASE")
                            .entityId(disease.getDiseaseId())
                            .title(disease.getDiseaseName())
                            .description(truncate(disease.getDescription(), 200))
                            .build()));
        }

        if (context == null || "MEDICATION".equals(context)) {
            medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(medication -> results.add(SearchResultResponse.builder()
                            .entityType("MEDICATION")
                            .entityId(medication.getMedicationId())
                            .title(medication.getMedicationName())
                            .description(truncate(medication.getDescription(), 200))
                            .build()));
        }

        if (context == null || "EXERCISE".equals(context)) {
            trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(exercise -> results.add(SearchResultResponse.builder()
                            .entityType("EXERCISE")
                            .entityId(exercise.getExerciseId())
                            .title(exercise.getExerciseName())
                            .description(truncate(exercise.getDescription(), 200))
                            .build()));
        }

        if (context == null || "NUTRITION".equals(context)) {
            nutritionStandardRepository.findByRationNameContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(nutrition -> results.add(SearchResultResponse.builder()
                            .entityType("NUTRITION")
                            .entityId(nutrition.getStandardId())
                            .title(nutrition.getRationName())
                            .description(truncate(nutrition.getDescription(), 200))
                            .build()));
        }

        if (context == null || "FIRST_AID".equals(context)) {
            firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(keyword)
                    .forEach(guide -> results.add(SearchResultResponse.builder()
                            .entityType("FIRST_AID")
                            .entityId(guide.getGuideId())
                            .title(guide.getGuideTitle())
                            .description(truncate(guide.getDescription(), 200))
                            .build()));
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            SearchHistory history = SearchHistory.builder()
                    .user(user)
                    .searchKeyword(keyword)
                    .searchContext(context != null ? SearchContext.valueOf(context) : null)
                    .resultCount(results.size())
                    .searchedAt(LocalDateTime.now())
                    .build();
            searchHistoryRepository.save(history);
        }

        return results;
    }

    @Override
    public List<SearchHistoryResponse> getHistory(Integer userId) {
        return searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(userId)
                .stream()
                .map(h -> SearchHistoryResponse.builder()
                        .searchId(h.getSearchId())
                        .searchKeyword(h.getSearchKeyword())
                        .searchContext(h.getSearchContext() != null ? h.getSearchContext().name() : null)
                        .resultCount(h.getResultCount())
                        .searchedAt(h.getSearchedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getSuggestions(Integer userId, String keyword) {
        return searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(userId)
                .stream()
                .map(SearchHistory::getSearchKeyword)
                .distinct()
                .filter(k -> k.toLowerCase().startsWith(keyword.toLowerCase()))
                .limit(5)
                .collect(Collectors.toList());
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return null;
        }
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
