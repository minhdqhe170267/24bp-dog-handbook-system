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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionSeverity;
import vn.edu.fpt.doghandbook.backend.entity.enums.SessionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dog_id", nullable = false)
    private DogProfile dogProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    @Column(name = "issue_summary", nullable = false)
    private String issueSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initial_diagnosis_id", nullable = true)
    private DiagnosisRecord initialDiagnosis;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status = SessionStatus.ACTIVE;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private SessionSeverity severity = SessionSeverity.MEDIUM;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "last_update_at", nullable = false)
    private LocalDateTime lastUpdateAt;

    @Column(name = "follow_up_date", nullable = true)
    private LocalDate followUpDate;

    @Column(name = "resolution_notes", nullable = true)
    private String resolutionNotes;

    @Column(name = "resolved_at", nullable = true)
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.startedAt == null) {
            this.startedAt = now;
        }
        if (this.lastUpdateAt == null) {
            this.lastUpdateAt = now;
        }
        if (this.status == null) {
            this.status = SessionStatus.ACTIVE;
        }
        if (this.severity == null) {
            this.severity = SessionSeverity.MEDIUM;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdateAt = LocalDateTime.now();
    }
}
