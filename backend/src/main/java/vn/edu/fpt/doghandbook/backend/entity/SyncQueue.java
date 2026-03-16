package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncActionType;
import vn.edu.fpt.doghandbook.backend.entity.enums.SyncStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_queue")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "queue_id")
    private Integer queueId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private Integer entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private SyncActionType actionType;

    @Column(name = "payload_data", columnDefinition = "longtext", nullable = true)
    private String payloadData;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false)
    private SyncStatus syncStatus = SyncStatus.PENDING;

    @Builder.Default
    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "error_message", nullable = true)
    private String errorMessage;

    @Column(name = "queued_at", nullable = false)
    private LocalDateTime queuedAt;

    @Column(name = "synced_at", nullable = true)
    private LocalDateTime syncedAt;

    @PrePersist
    protected void onCreate() {
        if (this.syncStatus == null) {
            this.syncStatus = SyncStatus.PENDING;
        }
        if (this.retryCount < 0) {
            this.retryCount = 0;
        }
        if (this.queuedAt == null) {
            this.queuedAt = LocalDateTime.now();
        }
    }
}
