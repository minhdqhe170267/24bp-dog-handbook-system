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
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_exercise")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exercise_id")
    private Integer exerciseId;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "description", nullable = true)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level", nullable = false)
    private DifficultyLevel difficultyLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "method_id", nullable = true)
    private TrainingMethod trainingMethod;

    @Column(name = "instructions", nullable = true)
    private String instructions;

    @Column(name = "duration_minutes", nullable = true)
    private Integer durationMinutes;

    @Column(name = "safety_precautions", nullable = true)
    private String safetyPrecautions;

    @Column(name = "required_equipment", nullable = true)
    private String requiredEquipment;

    @Column(name = "media_urls", columnDefinition = "json", nullable = true)
    private String mediaUrls;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ContentStatus status = ContentStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = true)
    @NotFound(action = NotFoundAction.IGNORE)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at", nullable = true)
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.status == null) {
            this.status = ContentStatus.DRAFT;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
