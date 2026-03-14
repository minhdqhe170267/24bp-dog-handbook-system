package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.repository.ContentRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.service.SyncService;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SyncServiceImpl implements SyncService {

    private static final int DEFAULT_BATCH_SIZE = 1000;

    private final DogBreedRepository dogBreedRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final DiseaseRepository diseaseRepository;
    private final MedicationRepository medicationRepository;
    private final FirstAidGuideRepository firstAidGuideRepository;
    private final ContentRepository contentRepository;

    @Override
    public SyncResponse getUpdatedContent(LocalDateTime lastSyncAt) {
        LocalDateTime effectiveLastSyncAt = normalizeLastSyncAt(lastSyncAt);
        Pageable pageable = PageRequest.of(0, DEFAULT_BATCH_SIZE, Sort.by(Sort.Direction.ASC, "updatedAt"));

        List<Map<String, Object>> breeds = dogBreedRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toBreedItem)
                .toList();

        List<Map<String, Object>> exercises = trainingExerciseRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toExerciseItem)
                .toList();

        List<Map<String, Object>> diseases = diseaseRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toDiseaseItem)
                .toList();

        List<Map<String, Object>> medications = medicationRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toMedicationItem)
                .toList();

        List<Map<String, Object>> firstAidGuides = firstAidGuideRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toFirstAidItem)
                .toList();

        List<Map<String, Object>> contents = contentRepository
                .findByStatusAndUpdatedAtAfterAndIsDeletedFalse(ContentStatus.PUBLISHED, effectiveLastSyncAt, pageable)
                .getContent()
                .stream()
                .map(this::toContentItem)
                .toList();

        Map<String, List<?>> data = new LinkedHashMap<>();
        data.put("breeds", breeds);
        data.put("exercises", exercises);
        data.put("diseases", diseases);
        data.put("medications", medications);
        data.put("firstAidGuides", firstAidGuides);
        data.put("contents", contents);

        return SyncResponse.builder()
                .data(data)
                .syncTimestamp(LocalDateTime.now())
                .build();
    }

    private LocalDateTime normalizeLastSyncAt(LocalDateTime lastSyncAt) {
        if (lastSyncAt == null) {
            return LocalDateTime.of(1970, 1, 1, 0, 0);
        }
        return lastSyncAt;
    }

    private Map<String, Object> toBreedItem(DogBreed breed) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("breedId", breed.getBreedId());
        item.put("breedName", breed.getBreedName());
        item.put("description", breed.getDescription());
        item.put("imageUrl", breed.getImageUrl());
        item.put("status", breed.getStatus() == null ? null : breed.getStatus().name());
        item.put("updatedAt", breed.getUpdatedAt());
        return item;
    }

    private Map<String, Object> toExerciseItem(TrainingExercise exercise) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("exerciseId", exercise.getExerciseId());
        item.put("exerciseName", exercise.getExerciseName());
        item.put("description", exercise.getDescription());
        item.put("difficultyLevel", exercise.getDifficultyLevel() == null ? null : exercise.getDifficultyLevel().name());
        item.put("status", exercise.getStatus() == null ? null : exercise.getStatus().name());
        item.put("updatedAt", exercise.getUpdatedAt());
        return item;
    }

    private Map<String, Object> toDiseaseItem(Disease disease) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("diseaseId", disease.getDiseaseId());
        item.put("diseaseName", disease.getDiseaseName());
        item.put("description", disease.getDescription());
        item.put("severityLevel", disease.getSeverityLevel() == null ? null : disease.getSeverityLevel().name());
        item.put("isContagious", disease.getIsContagious());
        item.put("status", disease.getStatus() == null ? null : disease.getStatus().name());
        item.put("updatedAt", disease.getUpdatedAt());
        return item;
    }

    private Map<String, Object> toMedicationItem(Medication medication) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("medicationId", medication.getMedicationId());
        item.put("medicationName", medication.getMedicationName());
        item.put("description", medication.getDescription());
        item.put("dosageInstructions", medication.getDosageInstructions());
        item.put("administrationMethod", medication.getAdministrationMethod());
        item.put("status", medication.getStatus() == null ? null : medication.getStatus().name());
        item.put("updatedAt", medication.getUpdatedAt());
        return item;
    }

    private Map<String, Object> toFirstAidItem(FirstAidGuide guide) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("guideId", guide.getGuideId());
        item.put("guideTitle", guide.getGuideTitle());
        item.put("emergencyType", guide.getEmergencyType());
        item.put("description", guide.getDescription());
        item.put("status", guide.getStatus() == null ? null : guide.getStatus().name());
        item.put("updatedAt", guide.getUpdatedAt());
        return item;
    }

    private Map<String, Object> toContentItem(Content content) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("contentId", content.getContentId());
        item.put("title", content.getTitle());
        item.put("contentType", content.getContentType() == null ? null : content.getContentType().name());
        item.put("summary", content.getSummary());
        item.put("status", content.getStatus() == null ? null : content.getStatus().name());
        item.put("publishedAt", content.getPublishedAt());
        item.put("updatedAt", content.getUpdatedAt());
        return item;
    }
}
