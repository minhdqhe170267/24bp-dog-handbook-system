package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.SyncResponse;

import java.time.LocalDateTime;


public interface SyncService {

    SyncResponse getUpdatedContent(LocalDateTime lastSyncAt);
}
