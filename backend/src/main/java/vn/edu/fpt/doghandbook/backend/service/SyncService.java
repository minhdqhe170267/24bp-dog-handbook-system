package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.SyncPushRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushBatchResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncPushItemResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncQueueResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.SyncStatusResponse;

import java.time.LocalDateTime;
import java.util.List;


public interface SyncService {

    SyncResponse getUpdatedContent(LocalDateTime lastSyncAt, Integer userId);

    SyncQueueResponse pushToQueue(SyncPushRequest request, Integer userId);

    SyncPushBatchResponse pushBatch(List<SyncPushRequest> items, Integer userId);

    List<SyncPushItemResponse> processPending(Integer userId);

    SyncStatusResponse getStatus(Integer userId);
}
