package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.ObjectMapper;
import vn.edu.fpt.doghandbook.backend.dto.request.ConflictResolveRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictListResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.SyncConflictLog;
import vn.edu.fpt.doghandbook.backend.entity.SyncQueue;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ResolutionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.ContentSuggestionRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiagnosisRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.FieldNoteRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthRecordRepository;
import vn.edu.fpt.doghandbook.backend.repository.HealthSessionRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.SessionFollowUpRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncConflictLogRepository;
import vn.edu.fpt.doghandbook.backend.repository.SyncQueueRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.repository.WeightAssessmentRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.SyncServiceImpl;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SyncServiceImplTest {

    @Mock private NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    @Mock private SyncQueueRepository syncQueueRepository;
    @Mock private SyncConflictLogRepository syncConflictLogRepository;
    @Mock private UserRepository userRepository;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private FieldNoteRepository fieldNoteRepository;
    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private ContentSuggestionRepository contentSuggestionRepository;
    @Mock private HealthSessionRepository healthSessionRepository;
    @Mock private SessionFollowUpRepository sessionFollowUpRepository;
    @Mock private WeightAssessmentRepository weightAssessmentRepository;
    @Mock private OperationReportRepository operationReportRepository;
    @Mock private DiagnosisRecordRepository diagnosisRecordRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private SyncServiceImpl service;

    @Test
    void getUpdatedContent_withoutLastSyncAt_returnsPublishedSnapshot() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 3, 1, 9, 0);
        LocalDateTime updatedAt = LocalDateTime.of(2026, 3, 10, 9, 0);

        when(namedParameterJdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0, String.class);
                    if (sql.contains("FROM dog_breed")) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("breedId", 1);
                        row.put("breedName", "German Shepherd");
                        row.put("description", "Working breed");
                        row.put("imageUrl", "breed.jpg");
                        row.put("status", "PUBLISHED");
                        row.put("createdAt", Timestamp.valueOf(createdAt));
                        row.put("updatedAt", Timestamp.valueOf(updatedAt));
                        row.put("deletedAt", null);
                        row.put("isDeleted", 0);
                        return List.of(row);
                    }
                    return List.of();
                });
        when(notificationService.getNotificationsSince(any(), any())).thenReturn(List.of());

        SyncResponse response = service.getUpdatedContent(null, 1);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> breeds = (List<Map<String, Object>>) response.getData().get("breeds");
        assertThat(breeds).hasSize(1);
        assertThat(breeds.get(0).get("syncAction")).isEqualTo("CREATE");
        assertThat(breeds.get(0).get("breedName")).isEqualTo("German Shepherd");
    }

    @Test
    void getUpdatedContent_withDeletedBreed_returnsDeleteAction() {
        LocalDateTime lastSyncAt = LocalDateTime.of(2026, 3, 5, 9, 0);

        when(namedParameterJdbcTemplate.queryForList(anyString(), any(MapSqlParameterSource.class)))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0, String.class);
                    if (sql.contains("FROM dog_breed")) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("breedId", 2);
                        row.put("status", "PUBLISHED");
                        row.put("createdAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 1, 9, 0)));
                        row.put("updatedAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 6, 9, 0)));
                        row.put("deletedAt", Timestamp.valueOf(LocalDateTime.of(2026, 3, 6, 9, 0)));
                        row.put("isDeleted", 1);
                        return List.of(row);
                    }
                    return List.of();
                });
        when(notificationService.getNotificationsSince(any(), any())).thenReturn(List.of());

        SyncResponse response = service.getUpdatedContent(lastSyncAt, 1);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> breeds = (List<Map<String, Object>>) response.getData().get("breeds");
        assertThat(breeds).hasSize(1);
        assertThat(breeds.get(0).get("syncAction")).isEqualTo("DELETE");
        assertThat(breeds.get(0).get("breedId")).isEqualTo(2);
    }

    @Test
    void pushToQueue_savesPendingItem() {
        User user = user(7, "Trainer 7");
        SyncPushRequest request = pushRequest("local-1", "field_note", null, "CREATE", "{\"title\":\"Note\"}");

        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(syncQueueRepository.save(any(SyncQueue.class))).thenAnswer(invocation -> {
            SyncQueue queue = invocation.getArgument(0);
            queue.setQueueId(100);
            return queue;
        });

        SyncQueueResponse response = service.pushToQueue(request, 7);

        assertThat(response.getQueueId()).isEqualTo(100);
        assertThat(response.getUserId()).isEqualTo(7);
        assertThat(response.getEntityType()).isEqualTo("field_note");
        assertThat(response.getActionType()).isEqualTo("CREATE");
        assertThat(response.getSyncStatus()).isEqualTo("PENDING");
    }

    @Test
    void pushBatch_nullItems_throwsBadRequestException() {
        assertThatThrownBy(() -> service.pushBatch(null, 7))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không được để trống");
    }

    @Test
    void pushBatch_moreThan100Items_throwsBadRequestException() {
        List<SyncPushRequest> items = java.util.stream.IntStream.range(0, 101)
                .mapToObj(i -> pushRequest("id-" + i, "field_note", null, "CREATE", "{}"))
                .toList();

        assertThatThrownBy(() -> service.pushBatch(items, 7))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("100 items");
    }

    @Test
    void pushBatch_emptyItems_returnsZeroSummary() {
        SyncPushBatchResponse response = service.pushBatch(List.of(), 7);

        assertThat(response.getResults()).isEmpty();
        assertThat(response.getTotalSynced()).isZero();
        assertThat(response.getTotalConflicts()).isZero();
        assertThat(response.getTotalFailed()).isZero();
        assertThat(response.getServerTime()).isNotNull();
    }

    @Test
    void processPending_withoutItems_returnsEmptyList() {
        User user = user(7, "Trainer 7");
        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(syncQueueRepository.findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(7, SyncStatus.PENDING))
                .thenReturn(List.of());

        assertThat(service.processPending(7)).isEmpty();
    }

    @Test
    void getStatus_returnsCountsLastSyncAndPendingItems() {
        User user = user(7, "Trainer 7");
        SyncQueue pending = queue(user, 10, "field_note", SyncActionType.CREATE, SyncStatus.PENDING,
                LocalDateTime.of(2026, 4, 7, 9, 0), null);
        SyncQueue completedOld = queue(user, 11, "field_note", SyncActionType.UPDATE, SyncStatus.COMPLETED,
                LocalDateTime.of(2026, 4, 6, 9, 0), LocalDateTime.of(2026, 4, 6, 9, 30));
        SyncQueue completedNew = queue(user, 12, "health_record", SyncActionType.CREATE, SyncStatus.COMPLETED,
                LocalDateTime.of(2026, 4, 7, 8, 0), LocalDateTime.of(2026, 4, 7, 8, 45));

        when(syncQueueRepository.countByUserUserIdAndSyncStatus(7, SyncStatus.PENDING)).thenReturn(1L);
        when(syncQueueRepository.countByUserUserIdAndSyncStatus(7, SyncStatus.COMPLETED)).thenReturn(2L);
        when(syncQueueRepository.countByUserUserIdAndSyncStatus(7, SyncStatus.FAILED)).thenReturn(3L);
        when(syncQueueRepository.countByUserUserIdAndSyncStatus(7, SyncStatus.CONFLICT)).thenReturn(4L);
        when(syncQueueRepository.findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(7, SyncStatus.PENDING))
                .thenReturn(List.of(pending));
        when(syncQueueRepository.findByUserUserIdAndSyncStatusOrderByQueuedAtAsc(7, SyncStatus.COMPLETED))
                .thenReturn(List.of(completedOld, completedNew));

        SyncStatusResponse response = service.getStatus(7);

        assertThat(response.getTotalPending()).isEqualTo(1);
        assertThat(response.getTotalCompleted()).isEqualTo(2);
        assertThat(response.getTotalFailed()).isEqualTo(3);
        assertThat(response.getTotalConflict()).isEqualTo(4);
        assertThat(response.getLastSyncAt()).isEqualTo(LocalDateTime.of(2026, 4, 7, 8, 45));
        assertThat(response.getPendingItems()).hasSize(1);
        assertThat(response.getPendingItems().get(0).getQueueId()).isEqualTo(10);
    }

    @Test
    void getConflicts_returnsPagedConflictList() {
        SyncConflictLog conflict = conflict(1, ConflictStatus.PENDING, "{\"title\":\"local\"}", "{\"title\":\"server\"}");

        when(syncConflictLogRepository.findByStatusOrderByConflictDetectedAtDesc(eq(ConflictStatus.PENDING), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conflict), PageRequest.of(0, 10), 1));

        PageResponse<SyncConflictListResponse> response = service.getConflicts(ConflictStatus.PENDING, PageRequest.of(0, 10));

        assertThat(response.getTotalElements()).isEqualTo(1);
        SyncConflictListResponse item = (SyncConflictListResponse) response.getContent().get(0);
        assertThat(item.getEntityType()).isEqualTo("field_note");
        assertThat(item.getStatus()).isEqualTo("PENDING");
        assertThat(item.getConflictedFieldCount()).isEqualTo(1);
    }

    @Test
    void getConflictDetail_returnsParsedPayloadsAndResolvedByName() {
        SyncConflictLog conflict = conflict(2, ConflictStatus.RESOLVED, "{\"title\":\"local\"}", "{\"title\":\"server\"}");
        conflict.setResolvedBy(99);
        conflict.setMergedData("{\"title\":\"merged\"}");
        conflict.setResolutionType(ResolutionType.MERGED);
        conflict.setResolutionNote("Merged manually");
        conflict.setResolvedAt(LocalDateTime.of(2026, 4, 7, 10, 0));

        when(syncConflictLogRepository.findById(2)).thenReturn(Optional.of(conflict));
        when(userRepository.findById(99)).thenReturn(Optional.of(user(99, "Admin User")));

        SyncConflictDetailResponse response = service.getConflictDetail(2);

        assertThat(response.getId()).isEqualTo(2);
        assertThat(response.getLocalData()).containsEntry("title", "local");
        assertThat(response.getServerData()).containsEntry("title", "server");
        assertThat(response.getMergedData()).containsEntry("title", "merged");
        assertThat(response.getResolutionType()).isEqualTo("MERGED");
        assertThat(response.getResolvedByName()).isEqualTo("Admin User");
        assertThat(response.getConflictedFields()).containsExactly("title");
    }

    @Test
    void getConflictDetail_notFound_throwsResourceNotFoundException() {
        when(syncConflictLogRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConflictDetail(999))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void resolveConflict_keepServer_marksConflictDismissed() {
        SyncConflictLog conflict = conflict(3, ConflictStatus.PENDING, "{\"title\":\"local\"}", "{\"title\":\"server\"}");
        when(syncConflictLogRepository.findById(3)).thenReturn(Optional.of(conflict));
        when(syncConflictLogRepository.save(any(SyncConflictLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConflictResolveRequest request = new ConflictResolveRequest(ResolutionType.KEEP_SERVER, null, "Keep server version");

        SyncConflictDetailResponse response = service.resolveConflict(3, request, 88);

        assertThat(response.getStatus()).isEqualTo("DISMISSED");
        assertThat(response.getResolutionType()).isEqualTo("KEEP_SERVER");
        assertThat(response.getResolutionNote()).isEqualTo("Keep server version");
        assertThat(conflict.getResolvedBy()).isEqualTo(88);
        assertThat(conflict.getResolvedAt()).isNotNull();
    }

    @Test
    void resolveConflict_nonPendingConflict_throwsBadRequestException() {
        SyncConflictLog conflict = conflict(4, ConflictStatus.RESOLVED, "{\"title\":\"local\"}", "{\"title\":\"server\"}");
        when(syncConflictLogRepository.findById(4)).thenReturn(Optional.of(conflict));

        assertThatThrownBy(() -> service.resolveConflict(4,
                new ConflictResolveRequest(ResolutionType.KEEP_SERVER, null, null), 88))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã được xử lý");
    }

    @Test
    void getPendingConflictCount_returnsRepositoryValue() {
        when(syncConflictLogRepository.countByStatus(ConflictStatus.PENDING)).thenReturn(5L);

        assertThat(service.getPendingConflictCount()).isEqualTo(5L);
    }

    @Test
    void getTrainerConflicts_returnsMappedPendingConflicts() {
        SyncConflictLog conflict = conflict(5, ConflictStatus.PENDING, "{\"title\":\"local\"}", "{\"title\":\"server\"}");
        when(syncConflictLogRepository.findByTrainerIdAndStatus(7, ConflictStatus.PENDING)).thenReturn(List.of(conflict));

        List<SyncConflictListResponse> response = service.getTrainerConflicts(7);

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo(5);
        assertThat(response.get(0).getTrainerName()).isEqualTo("Trainer 7");
    }

    private SyncPushRequest pushRequest(String localId, String entityType, Integer entityId, String actionType, String payload) {
        SyncPushRequest request = new SyncPushRequest();
        request.setLocalId(localId);
        request.setEntityType(entityType);
        request.setEntityId(entityId);
        request.setActionType(actionType);
        request.setPayloadData(payload);
        return request;
    }

    private User user(Integer id, String fullName) {
        return User.builder()
                .userId(id)
                .username("user" + id)
                .passwordHash("hash")
                .fullName(fullName)
                .role(UserRole.TRAINER)
                .build();
    }

    private SyncQueue queue(User user, Integer queueId, String entityType, SyncActionType actionType, SyncStatus status,
                            LocalDateTime queuedAt, LocalDateTime syncedAt) {
        return SyncQueue.builder()
                .queueId(queueId)
                .user(user)
                .localId("local-" + queueId)
                .entityType(entityType)
                .entityId(queueId)
                .actionType(actionType)
                .payloadData("{}")
                .syncStatus(status)
                .retryCount(0)
                .queuedAt(queuedAt)
                .syncedAt(syncedAt)
                .build();
    }

    private SyncConflictLog conflict(Integer id, ConflictStatus status, String localData, String serverData) {
        return SyncConflictLog.builder()
                .conflictId(id)
                .entityType("field_note")
                .entityId(10)
                .localId("local-" + id)
                .localData(localData)
                .serverData(serverData)
                .status(status)
                .trainerId(7)
                .trainerName("Trainer 7")
                .serverModifiedBy("Admin")
                .conflictDetectedAt(LocalDateTime.of(2026, 4, 7, 9, 0))
                .build();
    }
}
