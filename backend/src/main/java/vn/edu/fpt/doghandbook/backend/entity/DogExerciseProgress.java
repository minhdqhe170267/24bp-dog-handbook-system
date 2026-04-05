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
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dog_exercise_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DogExerciseProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "progress_id")
    private Integer progressId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private DogSpecialtyEnrollment enrollment;

    @Column(name = "roadmap_exercise_id", nullable = false)
    private Integer roadmapExerciseId;

    @Column(name = "roadmap_id", nullable = false)
    private Integer roadmapId;

    @Column(name = "roadmap_name", nullable = false)
    private String roadmapName;

    @Column(name = "roadmap_order", nullable = false)
    private Integer roadmapOrder;

    @Column(name = "target_role")
    private String targetRole;

    @Column(name = "phase_id", nullable = false)
    private Integer phaseId;

    @Column(name = "phase_name", nullable = false)
    private String phaseName;

    @Column(name = "phase_order", nullable = false)
    private Integer phaseOrder;

    @Column(name = "phase_duration_weeks")
    private Integer phaseDurationWeeks;

    @Column(name = "phase_objectives")
    private String phaseObjectives;

    @Column(name = "assessment_criteria")
    private String assessmentCriteria;

    @Column(name = "exercise_id", nullable = false)
    private Integer exerciseId;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "exercise_order", nullable = false)
    private Integer exerciseOrder;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExerciseProgressStatus status = ExerciseProgressStatus.NOT_STARTED;

    @Column(name = "score", precision = 5, scale = 2, nullable = true)
    private BigDecimal score;

    @Column(name = "trainer_notes", nullable = true)
    private String trainerNotes;

    @Column(name = "started_at", nullable = true)
    private LocalDateTime startedAt;

    @Column(name = "completed_at", nullable = true)
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluated_by", nullable = true)
    private User evaluatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.roadmapOrder == null || this.roadmapOrder <= 0) {
            this.roadmapOrder = 1;
        }
        if (this.phaseOrder == null || this.phaseOrder <= 0) {
            this.phaseOrder = 1;
        }
        if (this.exerciseOrder == null || this.exerciseOrder <= 0) {
            this.exerciseOrder = 1;
        }
        if (this.status == null) {
            this.status = ExerciseProgressStatus.NOT_STARTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
