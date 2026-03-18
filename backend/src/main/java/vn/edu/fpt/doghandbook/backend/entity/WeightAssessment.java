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
import vn.edu.fpt.doghandbook.backend.entity.enums.WeightStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "weight_assessment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeightAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assessment_id")
    private Integer assessmentId;

    @Column(name = "local_id", length = 36, unique = true)
    private String localId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dog_id", nullable = false)
    private DogProfile dogProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessor_id", nullable = false)
    private User assessor;

    @Column(name = "recorded_weight_kg", precision = 5, scale = 2, nullable = false)
    private BigDecimal recordedWeightKg;

    @Column(name = "standard_min_kg", precision = 5, scale = 2, nullable = false)
    private BigDecimal standardMinKg;

    @Column(name = "standard_max_kg", precision = 5, scale = 2, nullable = false)
    private BigDecimal standardMaxKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WeightStatus status;

    @Column(name = "deviation_percent", precision = 5, scale = 2, nullable = true)
    private BigDecimal deviationPercent;

    @Column(name = "recommendation", nullable = true)
    private String recommendation;

    @Column(name = "follow_up_weeks", nullable = true)
    private Integer followUpWeeks;

    @Column(name = "assessed_at", nullable = false)
    private LocalDateTime assessedAt;

    @Column(name = "updated_at", nullable = true)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.assessedAt == null) {
            this.assessedAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
