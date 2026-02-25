package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "entity_type", nullable = true)
    private String entityType;

    @Column(name = "entity_id", nullable = true)
    private Integer entityId;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "old_values", columnDefinition = "json", nullable = true)
    private String oldValues;

    @Column(name = "new_values", columnDefinition = "json", nullable = true)
    private String newValues;

    @Column(name = "ip_address", nullable = true)
    private String ipAddress;

    @Column(name = "action_timestamp", nullable = false)
    private LocalDateTime actionTimestamp;

    @PrePersist
    protected void onCreate() {
        if (this.actionTimestamp == null) {
            this.actionTimestamp = LocalDateTime.now();
        }
    }
}
