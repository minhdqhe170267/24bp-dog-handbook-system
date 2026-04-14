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
import org.hibernate.annotations.SQLRestriction;
import vn.edu.fpt.doghandbook.backend.entity.enums.FollowUpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "session_follow_up")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionFollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "followup_id")
    private Integer followupId;

    @Column(name = "local_id", length = 36, unique = true)
    private String localId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private HealthSession healthSession;

    @Column(name = "followup_date", nullable = false)
    private LocalDateTime followupDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_update", nullable = false)
    private FollowUpStatus statusUpdate;

    @Column(name = "notes", nullable = true)
    private String notes;

    @Column(name = "weight_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightKg;

    @Column(name = "temperature_c", precision = 4, scale = 1, nullable = true)
    private BigDecimal temperatureC;

    @Column(name = "next_action", nullable = true)
    private String nextAction;

    @Column(name = "updated_at", nullable = true)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at", nullable = true)
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.followupDate == null) {
            this.followupDate = now;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
