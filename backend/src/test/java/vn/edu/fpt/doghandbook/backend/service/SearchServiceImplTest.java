package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchHistoryResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SearchResultResponse;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.SearchContext;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.impl.SearchServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceImplTest {

    @Mock private SearchHistoryRepository searchHistoryRepository;
    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;
    @Mock private FirstAidGuideRepository firstAidGuideRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private SearchServiceImpl service;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().userId(1).username("trainer01").fullName("Trainer One")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
    }

    // ──────────────────── search ────────────────────

    @Test
    void search_noContext_searchesAllEntities() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("Labrador").description("Friendly dog").isDeleted(false).build();
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(List.of(breed));
        when(diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(Collections.emptyList());
        when(medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(Collections.emptyList());
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(Collections.emptyList());
        when(nutritionStandardRepository.findByRationNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(Collections.emptyList());
        when(firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(Collections.emptyList());
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        List<SearchResultResponse> results = service.search("lab", null, 1);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getEntityType()).isEqualTo("BREED");
        assertThat(results.get(0).getTitle()).isEqualTo("Labrador");
    }

    @Test
    void search_withBreedContext_onlySearchesBreeds() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("Labrador").description("Friendly").isDeleted(false).build();
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse("lab")).thenReturn(List.of(breed));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        List<SearchResultResponse> results = service.search("lab", "BREED", 1);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getEntityType()).isEqualTo("BREED");
        // Other repositories should NOT be called
        verifyNoInteractions(diseaseRepository, medicationRepository, trainingExerciseRepository);
    }

    @Test
    void search_savesSearchHistory() {
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(nutritionStandardRepository.findByRationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        service.search("test", null, 1);

        verify(searchHistoryRepository).save(any(SearchHistory.class));
    }

    @Test
    void search_userNotFound_doesNotSaveHistory() {
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(nutritionStandardRepository.findByRationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        service.search("test", null, 999);

        verify(searchHistoryRepository, never()).save(any());
    }

    @Test
    void search_emptyResults_returnsEmptyList() {
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(medicationRepository.findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(trainingExerciseRepository.findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(nutritionStandardRepository.findByRationNameContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(firstAidGuideRepository.findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(anyString())).thenReturn(Collections.emptyList());
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        List<SearchResultResponse> results = service.search("xyz", null, 1);

        assertThat(results).isEmpty();
    }

    @Test
    void search_diseaseContext_onlySearchesDiseases() {
        Disease disease = Disease.builder().diseaseId(5).diseaseName("Parvovirus").description("Viral infection").isDeleted(false).build();
        when(diseaseRepository.findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse("parvo")).thenReturn(List.of(disease));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        List<SearchResultResponse> results = service.search("parvo", "DISEASE", 1);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getEntityType()).isEqualTo("DISEASE");
        assertThat(results.get(0).getEntityId()).isEqualTo(5);
    }

    @Test
    void search_truncatesLongDescription() {
        String longDesc = "A".repeat(300);
        DogBreed breed = DogBreed.builder().breedId(1).breedName("Test").description(longDesc).isDeleted(false).build();
        when(dogBreedRepository.findByBreedNameContainingIgnoreCaseAndIsDeletedFalse("Test")).thenReturn(List.of(breed));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        List<SearchResultResponse> results = service.search("Test", "BREED", 1);

        assertThat(results.get(0).getDescription()).hasSize(203); // 200 + "..."
    }

    // ──────────────────── getHistory ────────────────────

    @Test
    void getHistory_returnsList() {
        SearchHistory history = SearchHistory.builder()
                .searchId(1).user(user).searchKeyword("test")
                .searchContext(SearchContext.BREED).resultCount(5)
                .searchedAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(history));

        List<SearchHistoryResponse> results = service.getHistory(1);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getSearchKeyword()).isEqualTo("test");
    }

    @Test
    void getHistory_emptyResult() {
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(Collections.emptyList());

        List<SearchHistoryResponse> results = service.getHistory(1);

        assertThat(results).isEmpty();
    }

    @Test
    void getHistory_mapsFields() {
        SearchHistory history = SearchHistory.builder()
                .searchId(10).user(user).searchKeyword("labrador")
                .searchContext(SearchContext.BREED).resultCount(3)
                .searchedAt(LocalDateTime.of(2025, 2, 15, 14, 30)).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(history));

        List<SearchHistoryResponse> results = service.getHistory(1);

        assertThat(results.get(0).getSearchId()).isEqualTo(10);
        assertThat(results.get(0).getSearchContext()).isEqualTo("BREED");
        assertThat(results.get(0).getResultCount()).isEqualTo(3);
        assertThat(results.get(0).getSearchedAt()).isEqualTo(LocalDateTime.of(2025, 2, 15, 14, 30));
    }

    @Test
    void getHistory_nullContext_mapsNull() {
        SearchHistory history = SearchHistory.builder()
                .searchId(11).user(user).searchKeyword("test")
                .searchContext(null).resultCount(0)
                .searchedAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(history));

        List<SearchHistoryResponse> results = service.getHistory(1);

        assertThat(results.get(0).getSearchContext()).isNull();
    }

    @Test
    void getHistory_multipleRecords_returnsAll() {
        SearchHistory h1 = SearchHistory.builder().searchId(1).user(user).searchKeyword("a")
                .resultCount(1).searchedAt(LocalDateTime.now()).build();
        SearchHistory h2 = SearchHistory.builder().searchId(2).user(user).searchKeyword("b")
                .resultCount(2).searchedAt(LocalDateTime.now()).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(h1, h2));

        List<SearchHistoryResponse> results = service.getHistory(1);

        assertThat(results).hasSize(2);
    }

    // ──────────────────── getSuggestions ────────────────────

    @Test
    void getSuggestions_returnsMatchingKeywords() {
        SearchHistory h1 = SearchHistory.builder().searchId(1).user(user).searchKeyword("labrador")
                .searchedAt(LocalDateTime.now()).build();
        SearchHistory h2 = SearchHistory.builder().searchId(2).user(user).searchKeyword("large breed")
                .searchedAt(LocalDateTime.now()).build();
        SearchHistory h3 = SearchHistory.builder().searchId(3).user(user).searchKeyword("poodle")
                .searchedAt(LocalDateTime.now()).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(h1, h2, h3));

        List<String> results = service.getSuggestions(1, "la");

        assertThat(results).containsExactly("labrador", "large breed");
    }

    @Test
    void getSuggestions_emptyHistory_returnsEmpty() {
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(Collections.emptyList());

        List<String> results = service.getSuggestions(1, "test");

        assertThat(results).isEmpty();
    }

    @Test
    void getSuggestions_noMatch_returnsEmpty() {
        SearchHistory h1 = SearchHistory.builder().searchId(1).user(user).searchKeyword("poodle")
                .searchedAt(LocalDateTime.now()).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(h1));

        List<String> results = service.getSuggestions(1, "lab");

        assertThat(results).isEmpty();
    }

    @Test
    void getSuggestions_caseInsensitive() {
        SearchHistory h1 = SearchHistory.builder().searchId(1).user(user).searchKeyword("Labrador")
                .searchedAt(LocalDateTime.now()).build();
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(List.of(h1));

        List<String> results = service.getSuggestions(1, "lab");

        assertThat(results).contains("Labrador");
    }

    @Test
    void getSuggestions_limitsTo5() {
        List<SearchHistory> histories = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            histories.add(SearchHistory.builder().searchId(i).user(user)
                    .searchKeyword("test" + i).searchedAt(LocalDateTime.now()).build());
        }
        when(searchHistoryRepository.findTop10ByUserUserIdOrderBySearchedAtDesc(1))
                .thenReturn(histories);

        List<String> results = service.getSuggestions(1, "test");

        assertThat(results).hasSizeLessThanOrEqualTo(5);
    }
}
