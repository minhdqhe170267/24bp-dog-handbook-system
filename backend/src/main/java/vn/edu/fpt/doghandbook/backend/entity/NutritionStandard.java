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
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLRestriction;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;

import java.time.LocalDateTime;

@Entity
@Table(name = "nutrition_standard")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionStandard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "standard_id")
    private Integer standardId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "breed_id", nullable = false)
    private DogBreed dogBreed;

    @Column(name = "ration_code", nullable = false, unique = true)
    private String rationCode;

    @Column(name = "ration_name", nullable = false)
    private String rationName;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "target_age_min_months", nullable = true)
    private Integer targetAgeMinMonths;

    @Column(name = "target_age_max_months", nullable = true)
    private Integer targetAgeMaxMonths;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = true)
    private ActivityLevel activityLevel;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(name = "health_condition", nullable = true)
    private HealthCondition healthCondition;

    @Column(name = "metadata", columnDefinition = "json", nullable = true)
    private String metadata;

    @Column(name = "special_notes", nullable = true)
    private String specialNotes;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ContentStatus status = ContentStatus.DRAFT;

    @Column(name = "published_at", nullable = true)
    private LocalDateTime publishedAt;

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

    @Transient
    private Double targetWeightMinKg;

    @Transient
    private Double targetWeightMaxKg;

    @Transient
    private Integer dailyCalories;

    @Transient
    private Double proteinGrams;

    @Transient
    private Double fatGrams;

    @Transient
    private Double carbGrams;

    @Transient
    private String ingredientsList;

    @Transient
    private String feedingSchedule;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.status == null) {
            this.status = ContentStatus.DRAFT;
        }
        if (this.healthCondition == null) {
            this.healthCondition = HealthCondition.NORMAL;
        }
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return standardId == null ? null : standardId.longValue();
    }

    public void setId(Long id) {
        this.standardId = id == null ? null : id.intValue();
    }

    public String getActivityLevel() {
        return activityLevel == null ? null : activityLevel.name();
    }

    public void setActivityLevel(String activityLevel) {
        this.activityLevel = parseActivityLevel(activityLevel);
    }

    public ActivityLevel getActivityLevelEnum() {
        return activityLevel;
    }

    public void setActivityLevelEnum(ActivityLevel activityLevel) {
        this.activityLevel = activityLevel;
    }

    public String getHealthCondition() {
        return healthCondition == null ? null : healthCondition.name();
    }

    public void setHealthCondition(String healthCondition) {
        this.healthCondition = parseHealthCondition(healthCondition);
    }

    public HealthCondition getHealthConditionEnum() {
        return healthCondition;
    }

    public void setHealthConditionEnum(HealthCondition healthCondition) {
        this.healthCondition = healthCondition;
    }

    public String getStatus() {
        return status == null ? null : status.name();
    }

    public void setStatus(String status) {
        this.status = parseContentStatus(status);
    }

    public ContentStatus getStatusEnum() {
        return status;
    }

    public void setStatusEnum(ContentStatus status) {
        this.status = status;
    }

    private ActivityLevel parseActivityLevel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return ActivityLevel.valueOf(value.trim().toUpperCase());
    }

    private HealthCondition parseHealthCondition(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return HealthCondition.valueOf(value.trim().toUpperCase());
    }

    private ContentStatus parseContentStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return ContentStatus.valueOf(value.trim().toUpperCase());
    }
}
