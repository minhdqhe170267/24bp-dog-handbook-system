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
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dog_profile")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DogProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dog_id")
    private Integer dogId;

    @Column(name = "dog_code", nullable = false, unique = true)
    private String dogCode;

    @Column(name = "dog_name", nullable = true)
    private String dogName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "breed_id", nullable = false)
    private DogBreed dogBreed;

    @Column(name = "birth_date", nullable = true)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private DogGender gender;

    @Column(name = "current_weight_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal currentWeightKg;

    @Column(name = "height_cm", precision = 5, scale = 2, nullable = true)
    private BigDecimal heightCm;

    @Column(name = "color", nullable = true)
    private String color;

    @Column(name = "microchip_id", nullable = true)
    private String microchipId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DogStatus status = DogStatus.ACTIVE;

    @Column(name = "assignment_date", nullable = true)
    private LocalDate assignmentDate;

    @Builder.Default
    @Column(name = "is_sterilized", nullable = false)
    private Boolean isSterilized = false;

    @Column(name = "image_url", nullable = true)
    private String imageUrl;

    @Column(name = "notes", nullable = true)
    private String notes;

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
            this.status = DogStatus.ACTIVE;
        }
        if (this.isSterilized == null) {
            this.isSterilized = false;
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
