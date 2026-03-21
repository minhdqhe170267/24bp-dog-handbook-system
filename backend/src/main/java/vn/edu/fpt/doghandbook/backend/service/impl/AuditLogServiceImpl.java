package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.edu.fpt.doghandbook.backend.config.CustomUserDetails;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.AuditLogStatsResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.entity.AuditLog;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.AuditLogRepository;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogServiceImpl.class);

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditActionType actionType, String entityType, Integer entityId,
                    String description, String oldValues, String newValues) {
        try {
            User currentUser = getCurrentUser();
            String ipAddress = getClientIpAddress();

            AuditLog auditLog = AuditLog.builder()
                    .user(currentUser)
                    .actionType(actionType.name())
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .ipAddress(ipAddress)
                    .build();

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write audit log: action={}, entity={}, id={}",
                    actionType, entityType, entityId, e);
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditActionType actionType, String entityType, Integer entityId, String description) {
        log(actionType, entityType, entityId, description, null, null);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logWithUser(User user, String ipAddress, AuditActionType actionType,
                            String entityType, Integer entityId, String description) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .user(user)
                    .actionType(actionType.name())
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .ipAddress(ipAddress)
                    .build();

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write audit log with user: action={}, entity={}, id={}",
                    actionType, entityType, entityId, e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAll(int page, int size,
                                                  String actionType, String entityType,
                                                  Integer userId, String from, String to) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "actionTimestamp"));

        Specification<AuditLog> spec = buildSpecification(actionType, entityType, userId, from, to);
        Page<AuditLog> auditPage = auditLogRepository.findAll(spec, pageable);

        Page<AuditLogResponse> responsePage = auditPage.map(this::toResponse);
        return PageResponse.from(responsePage);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLogResponse getById(Long id) {
        AuditLog auditLog = auditLogRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Audit log not found with id: " + id));
        return toResponse(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditLogStatsResponse getStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime weekStart = LocalDate.now().minusDays(6).atStartOfDay();
        LocalDateTime monthStart = LocalDate.now().minusDays(29).atStartOfDay();

        long totalLogs = auditLogRepository.count();
        long todayLogs = auditLogRepository.countByActionTimestampBetween(todayStart, now);
        long thisWeekLogs = auditLogRepository.countByActionTimestampBetween(weekStart, now);

        Map<String, Long> actionTypeCounts = new LinkedHashMap<>();
        List<Object[]> typeCounts = auditLogRepository.countByActionTypeGrouped(monthStart, now);
        for (Object[] row : typeCounts) {
            actionTypeCounts.put((String) row[0], (Long) row[1]);
        }

        List<AuditLogStatsResponse.DailyCount> dailyCounts = new ArrayList<>();
        List<Object[]> daily = auditLogRepository.countDailyBetween(weekStart, now);
        for (Object[] row : daily) {
            dailyCounts.add(AuditLogStatsResponse.DailyCount.builder()
                    .date(row[0].toString())
                    .count((Long) row[1])
                    .build());
        }

        return AuditLogStatsResponse.builder()
                .totalLogs(totalLogs)
                .todayLogs(todayLogs)
                .thisWeekLogs(thisWeekLogs)
                .actionTypeCounts(actionTypeCounts)
                .dailyCounts(dailyCounts)
                .build();
    }

    private Specification<AuditLog> buildSpecification(String actionType, String entityType,
                                                        Integer userId, String from, String to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (actionType != null && !actionType.isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), actionType));
            }
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (userId != null) {
                predicates.add(cb.equal(root.get("user").get("userId"), userId));
            }
            if (from != null && !from.isBlank()) {
                try {
                    LocalDateTime fromDate = LocalDate.parse(from).atStartOfDay();
                    predicates.add(cb.greaterThanOrEqualTo(root.get("actionTimestamp"), fromDate));
                } catch (DateTimeParseException ignored) {
                }
            }
            if (to != null && !to.isBlank()) {
                try {
                    LocalDateTime toDate = LocalDate.parse(to).atTime(LocalTime.MAX);
                    predicates.add(cb.lessThanOrEqualTo(root.get("actionTimestamp"), toDate));
                } catch (DateTimeParseException ignored) {
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        User user = auditLog.getUser();
        return AuditLogResponse.builder()
                .logId(auditLog.getLogId())
                .userId(user != null ? user.getUserId() : null)
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .actionType(auditLog.getActionType())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .description(auditLog.getDescription())
                .oldValues(auditLog.getOldValues())
                .newValues(auditLog.getNewValues())
                .ipAddress(auditLog.getIpAddress())
                .actionTimestamp(auditLog.getActionTimestamp())
                .build();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser();
        }
        return null;
    }

    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;

            HttpServletRequest request = attrs.getRequest();
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                return xForwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
