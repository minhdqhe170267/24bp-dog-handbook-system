package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>,
        JpaSpecificationExecutor<AuditLog> {

    Page<AuditLog> findByUser_UserId(Integer userId, Pageable pageable);

    Page<AuditLog> findByActionType(String actionType, Pageable pageable);

    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);

    Page<AuditLog> findByActionTimestampBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);

    long countByActionTimestampBetween(LocalDateTime from, LocalDateTime to);

    @Query("SELECT a.actionType, COUNT(a) FROM AuditLog a " +
            "WHERE a.actionTimestamp BETWEEN :from AND :to " +
            "GROUP BY a.actionType")
    List<Object[]> countByActionTypeGrouped(@Param("from") LocalDateTime from,
                                            @Param("to") LocalDateTime to);

    @Query("SELECT CAST(a.actionTimestamp AS localdate), COUNT(a) FROM AuditLog a " +
            "WHERE a.actionTimestamp BETWEEN :from AND :to " +
            "GROUP BY CAST(a.actionTimestamp AS localdate) " +
            "ORDER BY CAST(a.actionTimestamp AS localdate)")
    List<Object[]> countDailyBetween(@Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to);

    List<AuditLog> findTop10ByOrderByActionTimestampDesc();
}
