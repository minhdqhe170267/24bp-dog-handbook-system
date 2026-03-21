package vn.edu.fpt.doghandbook.backend.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private final AuditLogService auditLogService;

    public AuditAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.*.create*(..)) && " +
                    "!target(vn.edu.fpt.doghandbook.backend.service.impl.AuditLogServiceImpl)",
            returning = "result"
    )
    public void afterCreate(JoinPoint joinPoint, Object result) {
        logAction(joinPoint, AuditActionType.CREATE, result);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.*.update*(..)) && " +
                    "!target(vn.edu.fpt.doghandbook.backend.service.impl.AuditLogServiceImpl)",
            returning = "result"
    )
    public void afterUpdate(JoinPoint joinPoint, Object result) {
        logAction(joinPoint, AuditActionType.UPDATE, result);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.*.delete*(..)) && " +
                    "!target(vn.edu.fpt.doghandbook.backend.service.impl.AuditLogServiceImpl)"
    )
    public void afterDelete(JoinPoint joinPoint) {
        logDeleteAction(joinPoint);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.ApprovalServiceImpl.review*(..))",
            returning = "result"
    )
    public void afterReview(JoinPoint joinPoint, Object result) {
        String methodName = joinPoint.getSignature().getName();
        AuditActionType type = methodName.toLowerCase().contains("reject")
                ? AuditActionType.REJECT : AuditActionType.APPROVE;
        logAction(joinPoint, type, result);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.ApprovalServiceImpl.publish*(..))"
    )
    public void afterPublish(JoinPoint joinPoint) {
        logAction(joinPoint, AuditActionType.PUBLISH, null);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.ApprovalServiceImpl.unpublish*(..))"
    )
    public void afterUnpublish(JoinPoint joinPoint) {
        logAction(joinPoint, AuditActionType.UNPUBLISH, null);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.ApprovalServiceImpl.submitForReview*(..))"
    )
    public void afterSubmitForReview(JoinPoint joinPoint) {
        logAction(joinPoint, AuditActionType.SUBMIT_FOR_REVIEW, null);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.UserManagementServiceImpl.toggleLock*(..))",
            returning = "result"
    )
    public void afterToggleLock(JoinPoint joinPoint, Object result) {
        logAction(joinPoint, AuditActionType.LOCK_USER, result);
    }

    @AfterReturning(
            pointcut = "execution(* vn.edu.fpt.doghandbook.backend.service.impl.DocumentImportServiceImpl.confirm*(..))",
            returning = "result"
    )
    public void afterImport(JoinPoint joinPoint, Object result) {
        logAction(joinPoint, AuditActionType.IMPORT_DATA, result);
    }

    private void logAction(JoinPoint joinPoint, AuditActionType actionType, Object result) {
        try {
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String entityType = extractEntityType(className);
            String methodName = joinPoint.getSignature().getName();
            Integer entityId = extractEntityId(joinPoint.getArgs());

            String description = buildDescription(actionType, entityType, methodName);

            auditLogService.log(actionType, entityType, entityId, description);
        } catch (Exception e) {
            log.error("AuditAspect failed to log: {}", e.getMessage());
        }
    }

    private void logDeleteAction(JoinPoint joinPoint) {
        try {
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String entityType = extractEntityType(className);
            String methodName = joinPoint.getSignature().getName();
            Integer entityId = extractEntityId(joinPoint.getArgs());

            String description = buildDescription(AuditActionType.DELETE, entityType, methodName);

            auditLogService.log(AuditActionType.DELETE, entityType, entityId, description);
        } catch (Exception e) {
            log.error("AuditAspect failed to log delete: {}", e.getMessage());
        }
    }

    private String extractEntityType(String className) {
        // BreedServiceImpl -> BREED
        // DiseaseServiceImpl -> DISEASE
        // UserManagementServiceImpl -> USER
        return className
                .replace("ServiceImpl", "")
                .replace("Management", "")
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .toUpperCase();
    }

    private Integer extractEntityId(Object[] args) {
        if (args == null || args.length == 0) return null;
        // The first Integer/Long argument is typically the entity ID
        for (Object arg : args) {
            if (arg instanceof Integer id) return id;
            if (arg instanceof Long id) return id.intValue();
        }
        return null;
    }

    private String buildDescription(AuditActionType actionType, String entityType, String methodName) {
        return actionType.name() + " " + entityType + " via " + methodName;
    }
}
