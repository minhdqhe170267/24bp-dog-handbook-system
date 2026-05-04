package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import vn.edu.fpt.doghandbook.backend.converter.ResolutionTypeConverter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.ConflictStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ResolutionType;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_conflict_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncConflictLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conflict_id")
    private Integer conflictId;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Integer entityId;

    @Column(name = "local_id", length = 36)
    private String localId;

    @Column(name = "local_data", nullable = false, columnDefinition = "json")
    private String localData;

    @Column(name = "server_data", nullable = false, columnDefinition = "json")
    private String serverData;

    @Column(name = "merged_data", columnDefinition = "json")
    private String mergedData;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ConflictStatus status = ConflictStatus.PENDING;

    @Convert(converter = ResolutionTypeConverter.class)
    @Column(name = "resolution_type", length = 20)
    private ResolutionType resolutionType;

    @Column(name = "trainer_id")
    private Integer trainerId;

    @Column(name = "trainer_name", length = 100)
    private String trainerName;

    @Column(name = "server_modified_by", length = 100)
    private String serverModifiedBy;

    @Column(name = "resolved_by")
    private Integer resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "conflict_detected_at", nullable = false)
    private LocalDateTime conflictDetectedAt;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.conflictDetectedAt == null) {
            this.conflictDetectedAt = now;
        }
        if (this.status == null) {
            this.status = ConflictStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
