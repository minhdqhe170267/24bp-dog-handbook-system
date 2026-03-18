package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.SyncQueue;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;
import vn.edu.fpt.doghandbook.backend.repository.SyncQueueRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.SyncService;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SyncServiceImpl implements SyncService {

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    private final SyncQueueRepository syncQueueRepository;
    private final UserRepository userRepository;

    @Override
    public SyncResponse getUpdatedContent(LocalDateTime lastSyncAt, Integer userId) {
        SyncWindow syncWindow = resolveSyncWindow(lastSyncAt);

        Map<String, List<?>> data = new LinkedHashMap<>();

        // --- 6 existing entities (with status + is_deleted) ---
        data.put("breeds", fetchSyncItems(
                "dog_breed",
                "breed_id AS breedId, breed_name AS breedName, description, image_url AS imageUrl",
                "breed_id",
                syncWindow,
                this::toBreedItem
        ));
        data.put("exercises", fetchSyncItems(
                "training_exercise",
                "exercise_id AS exerciseId, exercise_name AS exerciseName, description, difficulty_level AS difficultyLevel",
                "exercise_id",
                syncWindow,
                this::toExerciseItem
        ));
        data.put("diseases", fetchSyncItems(
                "disease",
                "disease_id AS diseaseId, disease_name AS diseaseName, description, severity_level AS severityLevel, is_contagious AS isContagious",
                "disease_id",
                syncWindow,
                this::toDiseaseItem
        ));
        data.put("medications", fetchSyncItems(
                "medication",
                "medication_id AS medicationId, medication_name AS medicationName, description, dosage_instructions AS dosageInstructions, administration_method AS administrationMethod",
                "medication_id",
                syncWindow,
                this::toMedicationItem
        ));
        data.put("firstAidGuides", fetchSyncItems(
                "first_aid_guide",
                "guide_id AS guideId, guide_title AS guideTitle, emergency_type AS emergencyType, description",
                "guide_id",
                syncWindow,
                this::toFirstAidItem
        ));
        data.put("contents", fetchSyncItems(
                "content",
                "content_id AS contentId, title, content_type AS contentType, summary, published_at AS publishedAt",
                "content_id",
                syncWindow,
                this::toContentItem
        ));

        // --- 6 new entities with status + is_deleted ---
        data.put("symptoms", fetchSyncItemsNoSoftDelete(
                "symptom",
                "symptom_id AS symptomId, symptom_code AS symptomCode, symptom_name AS symptomName, category, severity_indicator AS severityIndicator, description",
                "symptom_id",
                syncWindow,
                this::toSymptomItem
        ));
        data.put("trainingMethods", fetchSyncItems(
                "training_method",
                "method_id AS methodId, method_name AS methodName, description, advantages, disadvantages, instructions",
                "method_id",
                syncWindow,
                this::toTrainingMethodItem
        ));
        data.put("nutritionStandards", fetchSyncItems(
                "nutrition_standard",
                "standard_id AS standardId, breed_id AS breedId, ration_code AS rationCode, ration_name AS rationName, description, target_age_min_months AS targetAgeMinMonths, target_age_max_months AS targetAgeMaxMonths, activity_level AS activityLevel, health_condition AS healthCondition, special_notes AS specialNotes",
                "standard_id",
                syncWindow,
                this::toNutritionStandardItem
        ));
        data.put("developmentStages", fetchSyncItems(
                "development_stage",
                "stage_id AS stageId, breed_id AS breedId, stage_name AS stageName, age_min_months AS ageMinMonths, age_max_months AS ageMaxMonths, stage_order AS stageOrder, physical_milestones AS physicalMilestones, behavioral_milestones AS behavioralMilestones, training_notes AS trainingNotes, nutrition_notes AS nutritionNotes",
                "stage_id",
                syncWindow,
                this::toDevelopmentStageItem
        ));
        data.put("roadmaps", fetchSyncItems(
                "training_roadmap",
                "roadmap_id AS roadmapId, roadmap_name AS roadmapName, breed_id AS breedId, target_role AS targetRole, description, total_duration_weeks AS totalDurationWeeks, phase_name AS phaseName, phase_order AS phaseOrder, phase_duration_weeks AS phaseDurationWeeks, phase_objectives AS phaseObjectives, assessment_criteria AS assessmentCriteria",
                "roadmap_id",
                syncWindow,
                this::toRoadmapItem
        ));
        data.put("dogProfiles", fetchSyncItemsDogProfile(
                syncWindow,
                this::toDogProfileItem
        ));

        // --- 2 junction tables (no audit fields) ---
        data.put("diseaseSymptomMappings", fetchJunctionItems(
                "disease_symptom_mapping",
                "mapping_id AS mappingId, disease_id AS diseaseId, symptom_id AS symptomId, weight, is_primary AS isPrimary, notes",
                "mapping_id",
                this::toDiseaseSymptomMappingItem
        ));
        data.put("roadmapExercises", fetchJunctionItems(
                "roadmap_exercise",
                "roadmap_exercise_id AS roadmapExerciseId, roadmap_id AS roadmapId, exercise_id AS exerciseId, exercise_order AS exerciseOrder, is_mandatory AS isMandatory",
                "roadmap_exercise_id",
                this::toRoadmapExerciseItem
        ));

        // --- dogAssignments: filtered by current user ---
        data.put("dogAssignments", fetchDogAssignments(syncWindow, userId));

        // TODO: abnormalSigns — entity AbnormalSign does not exist yet

        return SyncResponse.builder()
                .data(data)
                .syncTimestamp(syncWindow.syncTimestamp())
                .build();
    }

    @Override
    @Transactional
    public SyncQueueResponse pushToQueue(SyncPushRequest request, Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        SyncQueue entity = SyncQueue.builder()
                .user(user)
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .actionType(SyncActionType.valueOf(request.getActionType()))
                .payloadData(request.getPayloadData())
                .syncStatus(SyncStatus.PENDING)
                .retryCount(0)
                .queuedAt(LocalDateTime.now())
                .build();

        SyncQueue saved = syncQueueRepository.save(entity);
        return toSyncQueueResponse(saved);
    }

    @Override
    @Transactional
    public List<SyncQueueResponse> processPending(Integer userId) {
        List<SyncQueue> pendingItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.PENDING);

        LocalDateTime now = LocalDateTime.now();
        for (SyncQueue item : pendingItems) {
            item.setSyncStatus(SyncStatus.COMPLETED);
            item.setSyncedAt(now);
        }

        List<SyncQueue> saved = syncQueueRepository.saveAll(pendingItems);
        return saved.stream().map(this::toSyncQueueResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SyncStatusResponse getStatus(Integer userId) {
        long pending = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.PENDING);
        long completed = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.COMPLETED);
        long failed = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.FAILED);
        long conflict = syncQueueRepository.countByUserUserIdAndSyncStatus(userId, SyncStatus.CONFLICT);

        List<SyncQueue> pendingItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.PENDING);

        // lastSyncAt = most recent COMPLETED item's syncedAt
        List<SyncQueue> completedItems = syncQueueRepository
                .findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(userId, SyncStatus.COMPLETED);
        LocalDateTime lastSyncAt = completedItems.stream()
                .map(SyncQueue::getSyncedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return SyncStatusResponse.builder()
                .totalPending((int) pending)
                .totalCompleted((int) completed)
                .totalFailed((int) failed)
                .totalConflict((int) conflict)
                .lastSyncAt(lastSyncAt)
                .pendingItems(pendingItems.stream().map(this::toSyncQueueResponse).toList())
                .build();
    }

    private SyncQueueResponse toSyncQueueResponse(SyncQueue entity) {
        return SyncQueueResponse.builder()
                .queueId(entity.getQueueId())
                .userId(entity.getUser().getUserId())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .actionType(entity.getActionType().name())
                .syncStatus(entity.getSyncStatus().name())
                .retryCount(entity.getRetryCount())
                .errorMessage(entity.getErrorMessage())
                .queuedAt(entity.getQueuedAt())
                .syncedAt(entity.getSyncedAt())
                .build();
    }

    private SyncWindow resolveSyncWindow(LocalDateTime lastSyncAt) {
        LocalDateTime syncTimestamp = LocalDateTime.now();
        if (lastSyncAt != null && lastSyncAt.isAfter(syncTimestamp)) {
            syncTimestamp = lastSyncAt;
        }
        return new SyncWindow(lastSyncAt, syncTimestamp);
    }

    private List<Map<String, Object>> fetchSyncItems(
            String tableName,
            String selectClause,
            String idColumn,
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String sql = buildSyncSql(tableName, selectClause, idColumn, syncWindow.lastSyncAt());
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp())
                .addValue("publishedStatus", ContentStatus.PUBLISHED.name());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> mapSyncItem(row, syncWindow.lastSyncAt(), payloadMapper))
                .filter(Objects::nonNull)
                .toList();
    }

    private String buildSyncSql(String tableName, String selectClause, String idColumn, LocalDateTime lastSyncAt) {
        String auditColumns = selectClause
                + ", status AS status, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt, is_deleted AS isDeleted";

        if (lastSyncAt == null) {
            return """
                    SELECT %s
                    FROM %s
                    WHERE status = :publishedStatus
                      AND is_deleted = 0
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        }

        return """
                SELECT %s
                FROM %s
                WHERE updated_at > :lastSyncAt
                  AND updated_at <= :syncTimestamp
                ORDER BY updated_at ASC, %s ASC
                """.formatted(auditColumns, tableName, idColumn);
    }

    private Map<String, Object> mapSyncItem(
            Map<String, Object> row,
            LocalDateTime lastSyncAt,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        boolean isDeleted = toBoolean(row.get("isDeleted"));
        String status = toText(row.get("status"));
        LocalDateTime createdAt = toLocalDateTime(row.get("createdAt"));

        if (lastSyncAt != null && (isDeleted || !ContentStatus.PUBLISHED.name().equals(status))) {
            if (createdAt != null && createdAt.isAfter(lastSyncAt) && !isDeleted) {
                return null;
            }
            return toDeleteItem(row);
        }

        Map<String, Object> item = payloadMapper.apply(row);
        item.put("status", status);
        item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
        item.put("syncAction", resolveSyncAction(lastSyncAt, createdAt));
        return item;
    }

    private String resolveSyncAction(LocalDateTime lastSyncAt, LocalDateTime createdAt) {
        if (lastSyncAt == null) {
            return SyncActionType.CREATE.name();
        }
        if (createdAt != null && createdAt.isAfter(lastSyncAt)) {
            return SyncActionType.CREATE.name();
        }
        return SyncActionType.UPDATE.name();
    }

    private Map<String, Object> toDeleteItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        row.forEach((key, value) -> {
            if (key.endsWith("Id")) {
                item.put(key, value);
            }
        });
        item.put("status", toText(row.get("status")));
        item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
        item.put("deletedAt", toLocalDateTime(row.get("deletedAt")));
        item.put("isDeleted", toBoolean(row.get("isDeleted")));
        item.put("syncAction", SyncActionType.DELETE.name());
        return item;
    }

    private Map<String, Object> toBreedItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("breedId", row.get("breedId"));
        item.put("breedName", row.get("breedName"));
        item.put("description", row.get("description"));
        item.put("imageUrl", row.get("imageUrl"));
        return item;
    }

    private Map<String, Object> toExerciseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("exerciseId", row.get("exerciseId"));
        item.put("exerciseName", row.get("exerciseName"));
        item.put("description", row.get("description"));
        item.put("difficultyLevel", row.get("difficultyLevel"));
        return item;
    }

    private Map<String, Object> toDiseaseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("diseaseId", row.get("diseaseId"));
        item.put("diseaseName", row.get("diseaseName"));
        item.put("description", row.get("description"));
        item.put("severityLevel", row.get("severityLevel"));
        item.put("isContagious", toBoolean(row.get("isContagious")));
        return item;
    }

    private Map<String, Object> toMedicationItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("medicationId", row.get("medicationId"));
        item.put("medicationName", row.get("medicationName"));
        item.put("description", row.get("description"));
        item.put("dosageInstructions", row.get("dosageInstructions"));
        item.put("administrationMethod", row.get("administrationMethod"));
        return item;
    }

    private Map<String, Object> toFirstAidItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("guideId", row.get("guideId"));
        item.put("guideTitle", row.get("guideTitle"));
        item.put("emergencyType", row.get("emergencyType"));
        item.put("description", row.get("description"));
        return item;
    }

    // ── Fetch methods for entities without soft-delete (Symptom) ──

    private List<Map<String, Object>> fetchSyncItemsNoSoftDelete(
            String tableName,
            String selectClause,
            String idColumn,
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String auditColumns = selectClause
                + ", created_at AS createdAt, updated_at AS updatedAt";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM %s
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        } else {
            sql = """
                    SELECT %s
                    FROM %s
                    WHERE updated_at > :lastSyncAt
                      AND updated_at <= :syncTimestamp
                    ORDER BY updated_at ASC, %s ASC
                    """.formatted(auditColumns, tableName, idColumn);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(),
                            toLocalDateTime(row.get("createdAt"))));
                    return item;
                })
                .toList();
    }

    // ── Fetch method for DogProfile (uses DogStatus instead of ContentStatus) ──

    private List<Map<String, Object>> fetchSyncItemsDogProfile(
            SyncWindow syncWindow,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String selectClause = "dog_id AS dogId, dog_code AS dogCode, dog_name AS dogName, "
                + "breed_id AS breedId, birth_date AS birthDate, gender, "
                + "current_weight_kg AS currentWeightKg, height_cm AS heightCm, color, "
                + "microchip_id AS microchipId, status AS status, assignment_date AS assignmentDate, "
                + "is_sterilized AS isSterilized, image_url AS imageUrl, notes, "
                + "created_at AS createdAt, updated_at AS updatedAt, "
                + "deleted_at AS deletedAt, is_deleted AS isDeleted";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM dog_profile
                    WHERE is_deleted = 0
                    ORDER BY updated_at ASC, dog_id ASC
                    """.formatted(selectClause);
        } else {
            sql = """
                    SELECT %s
                    FROM dog_profile
                    WHERE updated_at > :lastSyncAt
                      AND updated_at <= :syncTimestamp
                    ORDER BY updated_at ASC, dog_id ASC
                    """.formatted(selectClause);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    boolean isDeleted = toBoolean(row.get("isDeleted"));
                    LocalDateTime createdAt = toLocalDateTime(row.get("createdAt"));

                    if (syncWindow.lastSyncAt() != null && isDeleted) {
                        if (createdAt != null && createdAt.isAfter(syncWindow.lastSyncAt())) {
                            return null;
                        }
                        return toDeleteItem(row);
                    }
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("status", toText(row.get("status")));
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(), createdAt));
                    return item;
                })
                .filter(Objects::nonNull)
                .toList();
    }

    // ── Fetch method for junction tables (no audit fields — always full sync) ──

    private List<Map<String, Object>> fetchJunctionItems(
            String tableName,
            String selectClause,
            String idColumn,
            Function<Map<String, Object>, Map<String, Object>> payloadMapper
    ) {
        String sql = "SELECT %s FROM %s ORDER BY %s ASC".formatted(selectClause, tableName, idColumn);
        MapSqlParameterSource params = new MapSqlParameterSource();

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = payloadMapper.apply(row);
                    item.put("syncAction", SyncActionType.CREATE.name());
                    return item;
                })
                .toList();
    }

    // ── Fetch method for DogAssignment (filtered by userId, uses is_active) ──

    private List<Map<String, Object>> fetchDogAssignments(SyncWindow syncWindow, Integer userId) {
        String selectClause = "assignment_id AS assignmentId, trainer_id AS trainerId, "
                + "dog_id AS dogId, assignment_type AS assignmentType, "
                + "start_date AS startDate, end_date AS endDate, "
                + "is_active AS isActive, notes, "
                + "created_at AS createdAt, updated_at AS updatedAt";
        String sql;
        if (syncWindow.lastSyncAt() == null) {
            sql = """
                    SELECT %s
                    FROM dog_assignment
                    WHERE trainer_id = :userId
                    ORDER BY updated_at ASC, assignment_id ASC
                    """.formatted(selectClause);
        } else {
            sql = """
                    SELECT %s
                    FROM dog_assignment
                    WHERE trainer_id = :userId
                      AND updated_at > :lastSyncAt
                      AND updated_at <= :syncTimestamp
                    ORDER BY updated_at ASC, assignment_id ASC
                    """.formatted(selectClause);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("lastSyncAt", syncWindow.lastSyncAt())
                .addValue("syncTimestamp", syncWindow.syncTimestamp());

        return namedParameterJdbcTemplate.queryForList(sql, params)
                .stream()
                .map(row -> {
                    Map<String, Object> item = toDogAssignmentItem(row);
                    item.put("updatedAt", toLocalDateTime(row.get("updatedAt")));
                    item.put("syncAction", resolveSyncAction(syncWindow.lastSyncAt(),
                            toLocalDateTime(row.get("createdAt"))));
                    return item;
                })
                .toList();
    }

    // ── Mapper methods for new entities ──

    private Map<String, Object> toSymptomItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("symptomId", row.get("symptomId"));
        item.put("symptomCode", row.get("symptomCode"));
        item.put("symptomName", row.get("symptomName"));
        item.put("category", toText(row.get("category")));
        item.put("severityIndicator", row.get("severityIndicator"));
        item.put("description", row.get("description"));
        return item;
    }

    private Map<String, Object> toTrainingMethodItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("methodId", row.get("methodId"));
        item.put("methodName", row.get("methodName"));
        item.put("description", row.get("description"));
        item.put("advantages", row.get("advantages"));
        item.put("disadvantages", row.get("disadvantages"));
        item.put("instructions", row.get("instructions"));
        return item;
    }

    private Map<String, Object> toNutritionStandardItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("standardId", row.get("standardId"));
        item.put("breedId", row.get("breedId"));
        item.put("rationCode", row.get("rationCode"));
        item.put("rationName", row.get("rationName"));
        item.put("description", row.get("description"));
        item.put("targetAgeMinMonths", row.get("targetAgeMinMonths"));
        item.put("targetAgeMaxMonths", row.get("targetAgeMaxMonths"));
        item.put("activityLevel", toText(row.get("activityLevel")));
        item.put("healthCondition", toText(row.get("healthCondition")));
        item.put("specialNotes", row.get("specialNotes"));
        return item;
    }

    private Map<String, Object> toDevelopmentStageItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("stageId", row.get("stageId"));
        item.put("breedId", row.get("breedId"));
        item.put("stageName", row.get("stageName"));
        item.put("ageMinMonths", row.get("ageMinMonths"));
        item.put("ageMaxMonths", row.get("ageMaxMonths"));
        item.put("stageOrder", row.get("stageOrder"));
        item.put("physicalMilestones", row.get("physicalMilestones"));
        item.put("behavioralMilestones", row.get("behavioralMilestones"));
        item.put("trainingNotes", row.get("trainingNotes"));
        item.put("nutritionNotes", row.get("nutritionNotes"));
        return item;
    }

    private Map<String, Object> toRoadmapItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("roadmapId", row.get("roadmapId"));
        item.put("roadmapName", row.get("roadmapName"));
        item.put("breedId", row.get("breedId"));
        item.put("targetRole", row.get("targetRole"));
        item.put("description", row.get("description"));
        item.put("totalDurationWeeks", row.get("totalDurationWeeks"));
        item.put("phaseName", row.get("phaseName"));
        item.put("phaseOrder", row.get("phaseOrder"));
        item.put("phaseDurationWeeks", row.get("phaseDurationWeeks"));
        item.put("phaseObjectives", row.get("phaseObjectives"));
        item.put("assessmentCriteria", row.get("assessmentCriteria"));
        return item;
    }

    private Map<String, Object> toDogProfileItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("dogId", row.get("dogId"));
        item.put("dogCode", row.get("dogCode"));
        item.put("dogName", row.get("dogName"));
        item.put("breedId", row.get("breedId"));
        item.put("birthDate", row.get("birthDate"));
        item.put("gender", toText(row.get("gender")));
        item.put("currentWeightKg", row.get("currentWeightKg"));
        item.put("heightCm", row.get("heightCm"));
        item.put("color", row.get("color"));
        item.put("microchipId", row.get("microchipId"));
        item.put("assignmentDate", row.get("assignmentDate"));
        item.put("isSterilized", toBoolean(row.get("isSterilized")));
        item.put("imageUrl", row.get("imageUrl"));
        item.put("notes", row.get("notes"));
        return item;
    }

    private Map<String, Object> toDiseaseSymptomMappingItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("mappingId", row.get("mappingId"));
        item.put("diseaseId", row.get("diseaseId"));
        item.put("symptomId", row.get("symptomId"));
        item.put("weight", row.get("weight"));
        item.put("isPrimary", toBoolean(row.get("isPrimary")));
        item.put("notes", row.get("notes"));
        return item;
    }

    private Map<String, Object> toRoadmapExerciseItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("roadmapExerciseId", row.get("roadmapExerciseId"));
        item.put("roadmapId", row.get("roadmapId"));
        item.put("exerciseId", row.get("exerciseId"));
        item.put("exerciseOrder", row.get("exerciseOrder"));
        item.put("isMandatory", toBoolean(row.get("isMandatory")));
        return item;
    }

    private Map<String, Object> toDogAssignmentItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("assignmentId", row.get("assignmentId"));
        item.put("trainerId", row.get("trainerId"));
        item.put("dogId", row.get("dogId"));
        item.put("assignmentType", toText(row.get("assignmentType")));
        item.put("startDate", row.get("startDate"));
        item.put("endDate", row.get("endDate"));
        item.put("isActive", toBoolean(row.get("isActive")));
        item.put("notes", row.get("notes"));
        return item;
    }

    private Map<String, Object> toContentItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("contentId", row.get("contentId"));
        item.put("title", row.get("title"));
        item.put("contentType", row.get("contentType"));
        item.put("summary", row.get("summary"));
        item.put("publishedAt", toLocalDateTime(row.get("publishedAt")));
        return item;
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof java.util.Date date) {
            return new Timestamp(date.getTime()).toLocalDateTime();
        }
        return LocalDateTime.parse(String.valueOf(value));
    }

    private boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String toText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private record SyncWindow(LocalDateTime lastSyncAt, LocalDateTime syncTimestamp) {
    }
}
