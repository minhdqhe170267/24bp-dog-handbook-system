package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictListResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ResolutionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.SyncService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(SyncController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SyncControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SyncService syncService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void pull_authenticatedPassesSinceAndUserIdToService() throws Exception {
        LocalDateTime since = LocalDateTime.of(2026, 3, 14, 8, 30);

        when(syncService.getUpdatedContent(eq(since), eq(7))).thenReturn(
                SyncResponse.builder()
                        .data(Map.of("contents", List.of()))
                        .syncTimestamp(LocalDateTime.of(2026, 3, 14, 9, 0))
                        .build()
        );

        mockMvc.perform(get("/sync/pull")
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .param("since", "2026-03-14T08:30:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.syncTimestamp").value("2026-03-14T09:00:00"));

        verify(syncService).getUpdatedContent(since, 7);
    }

    @Test
    void pull_unauthenticatedReturns401() throws Exception {
        mockMvc.perform(get("/sync/pull"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void status_authenticatedReturnsSyncStatus() throws Exception {
        when(syncService.getStatus(7)).thenReturn(SyncStatusResponse.builder()
                .totalPending(2)
                .totalCompleted(5)
                .totalFailed(1)
                .totalConflict(0)
                .lastSyncAt(LocalDateTime.of(2026, 4, 2, 9, 30))
                .pendingItems(List.of())
                .build());

        mockMvc.perform(get("/sync/status")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPending").value(2))
                .andExpect(jsonPath("$.data.totalCompleted").value(5));
    }

    @Test
    void status_contentEditorReturns403() throws Exception {
        mockMvc.perform(get("/sync/status")
                        .with(authenticatedUser(9, UserRole.CONTENT_EDITOR)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(syncService);
    }

    @Test
    void pushBatch_authenticatedReturnsQueuedResults() throws Exception {
        when(syncService.pushBatch(any(), eq(7))).thenReturn(SyncPushBatchResponse.builder()
                .results(List.of(SyncPushItemResponse.synced("local-1", 101, "CONTENT")))
                .serverTime(LocalDateTime.of(2026, 4, 8, 10, 0))
                .totalSynced(1)
                .totalConflicts(0)
                .totalFailed(0)
                .build());

        mockMvc.perform(post("/sync/push")
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"localId":"local-1","entityType":"CONTENT","actionType":"CREATE","payloadData":"{}"}]
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSynced").value(1))
                .andExpect(jsonPath("$.data.results[0].syncStatus").value("SYNCED"));
    }

    @Test
    void pushToQueue_authenticatedReturnsQueueItem() throws Exception {
        when(syncService.pushToQueue(any(), eq(7))).thenReturn(SyncQueueResponse.builder()
                .queueId(15)
                .userId(7)
                .entityType("CONTENT")
                .entityId(101)
                .actionType("CREATE")
                .syncStatus("PENDING")
                .build());

        mockMvc.perform(post("/sync/push/single")
                        .with(authenticatedUser(7, UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"localId":"local-1","entityType":"CONTENT","actionType":"CREATE","payloadData":"{}"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.queueId").value(15))
                .andExpect(jsonPath("$.data.syncStatus").value("PENDING"));
    }

    @Test
    void processPending_authenticatedReturnsResults() throws Exception {
        when(syncService.processPending(7)).thenReturn(List.of(
                SyncPushItemResponse.conflict("local-1", "CONTENT", Map.of("title", "server"))
        ));

        mockMvc.perform(post("/sync/process")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].syncStatus").value("CONFLICT"));
    }

    @Test
    void getConflicts_adminReturnsPagedData() throws Exception {
        when(syncService.getConflicts(eq(ConflictStatus.PENDING), any())).thenReturn(PageResponse.<SyncConflictListResponse>builder()
                .content(List.of(SyncConflictListResponse.builder()
                        .id(1)
                        .entityType("CONTENT")
                        .status("PENDING")
                        .trainerName("Trainer One")
                        .conflictedFieldCount(2)
                        .build()))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .build());

        mockMvc.perform(get("/sync/conflicts")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].entityType").value("CONTENT"))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING"));
    }

    @Test
    void getConflicts_trainerReturns400() throws Exception {
        mockMvc.perform(get("/sync/conflicts")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    @Test
    void getConflictDetail_authenticatedReturnsDetail() throws Exception {
        when(syncService.getConflictDetail(1)).thenReturn(SyncConflictDetailResponse.builder()
                .id(1)
                .entityType("CONTENT")
                .entityId(11)
                .status("PENDING")
                .trainerName("Trainer One")
                .conflictedFields(List.of("title"))
                .build());

        mockMvc.perform(get("/sync/conflicts/1")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.entityType").value("CONTENT"))
                .andExpect(jsonPath("$.data.conflictedFields[0]").value("title"));
    }

    @Test
    void resolveConflict_adminReturnsResolvedDetail() throws Exception {
        when(syncService.resolveConflict(eq(1), any(), eq(1))).thenReturn(SyncConflictDetailResponse.builder()
                .id(1)
                .status("RESOLVED")
                .resolutionType("KEEP_SERVER")
                .resolvedByName("Admin")
                .build());

        mockMvc.perform(put("/sync/conflicts/1/resolve")
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "resolutionType", ResolutionType.KEEP_SERVER.name(),
                                "resolutionNote", "Use server version"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.resolutionType").value("KEEP_SERVER"));
    }

    @Test
    void getConflictCount_adminReturnsPendingCount() throws Exception {
        when(syncService.getPendingConflictCount()).thenReturn(3L);

        mockMvc.perform(get("/sync/conflicts/count")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pending").value(3));
    }

    @Test
    void getMyConflicts_authenticatedReturnsTrainerConflicts() throws Exception {
        when(syncService.getTrainerConflicts(7)).thenReturn(List.of(
                SyncConflictListResponse.builder()
                        .id(2)
                        .entityType("MEDICATION")
                        .status("PENDING")
                        .trainerName("Trainer One")
                        .build()
        ));

        mockMvc.perform(get("/sync/my-conflicts")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].entityType").value("MEDICATION"));
    }
}
