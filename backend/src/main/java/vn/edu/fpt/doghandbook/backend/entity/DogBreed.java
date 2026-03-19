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
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dog_breed")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DogBreed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "breed_id")
    private Integer breedId;

    @Column(name = "breed_name", nullable = false, unique = true)
    private String breedName;

    @Column(name = "origin", nullable = true)
    private String origin;

    @Column(name = "description", nullable = true)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "size_classification", nullable = true)
    private SizeClassification sizeClassification;

    @Column(name = "weight_male_min_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightMaleMinKg;

    @Column(name = "weight_male_max_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightMaleMaxKg;

    @Column(name = "weight_female_min_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightFemaleMinKg;

    @Column(name = "weight_female_max_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightFemaleMaxKg;

    @Column(name = "avg_height_cm", precision = 5, scale = 2, nullable = true)
    private BigDecimal avgHeightCm;

    @Column(name = "lifespan_years", nullable = true)
    private String lifespanYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "trainability_level", nullable = true)
    private TrainabilityLevel trainabilityLevel;

    @Column(name = "operational_capabilities", nullable = true)
    private String operationalCapabilities;

    @Column(name = "metadata", columnDefinition = "json", nullable = true)
    private String metadata;

    @Column(name = "image_url", nullable = true)
    private String imageUrl;

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

    public Long getId() {
        return breedId == null ? null : breedId.longValue();
    }

    public void setId(Long id) {
        this.breedId = id == null ? null : id.intValue();
    }
}
