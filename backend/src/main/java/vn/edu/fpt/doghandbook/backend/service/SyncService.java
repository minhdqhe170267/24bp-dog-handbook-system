package vn.edu.fpt.doghandbook.backend.service;

import org.springframework.data.domain.Pageable;
import vn.edu.fpt.doghandbook.backend.dto.request.ConflictResolveRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictDetailResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncConflictListResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;

import java.time.LocalDateTime;
import java.util.List;


public interface SyncService {

    SyncResponse getUpdatedContent(LocalDateTime lastSyncAt, Integer userId);

    SyncQueueResponse pushToQueue(SyncPushRequest request, Integer userId);

    SyncPushBatchResponse pushBatch(List<SyncPushRequest> items, Integer userId);

    List<SyncPushItemResponse> processPending(Integer userId);

    SyncStatusResponse getStatus(Integer userId);

    // ── Conflict Resolution ──

    PageResponse<SyncConflictListResponse> getConflicts(ConflictStatus status, Pageable pageable);

    SyncConflictDetailResponse getConflictDetail(Integer conflictId);

    SyncConflictDetailResponse resolveConflict(Integer conflictId, ConflictResolveRequest request, Integer adminUserId);

    long getPendingConflictCount();

    List<SyncConflictListResponse> getTrainerConflicts(Integer trainerId);
}
