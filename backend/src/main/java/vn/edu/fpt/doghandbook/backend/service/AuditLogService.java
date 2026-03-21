package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;

public interface AuditLogService {

    void log(AuditActionType actionType, String entityType, Integer entityId,
             String description, String oldValues, String newValues);

    void log(AuditActionType actionType, String entityType, Integer entityId, String description);

    void logWithUser(User user, String ipAddress, AuditActionType actionType,
                     String entityType, Integer entityId, String description);

    PageResponse<AuditLogResponse> getAll(int page, int size,
                                          String actionType, String entityType,
                                          Integer userId, String from, String to);

    AuditLogResponse getById(Long id);

    AuditLogStatsResponse getStats();
}
