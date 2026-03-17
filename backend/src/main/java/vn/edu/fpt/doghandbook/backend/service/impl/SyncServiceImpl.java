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
    public SyncResponse getUpdatedContent(LocalDateTime lastSyncAt) {
        SyncWindow syncWindow = resolveSyncWindow(lastSyncAt);

        Map<String, List<?>> data = new LinkedHashMap<>();
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
