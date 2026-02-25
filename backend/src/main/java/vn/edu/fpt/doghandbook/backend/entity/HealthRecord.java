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
import vn.edu.fpt.doghandbook.backend.entity.enums.AppetiteLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.FecesStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_record")
@SQLRestriction("is_deleted = 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "record_id")
    private Integer recordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dog_id", nullable = false)
    private DogProfile dogProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examiner_id", nullable = false)
    private User examiner;

    @Column(name = "examination_date", nullable = false)
    private LocalDateTime examinationDate;

    @Column(name = "weight_kg", precision = 5, scale = 2, nullable = true)
    private BigDecimal weightKg;

    @Column(name = "temperature_c", precision = 4, scale = 1, nullable = true)
    private BigDecimal temperatureC;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "feces_status", nullable = true)
    private FecesStatus fecesStatus = FecesStatus.NOT_CHECKED;

    @Enumerated(EnumType.STRING)
    @Column(name = "appetite_level", nullable = true)
    private AppetiteLevel appetiteLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = true)
    private DogActivityLevel activityLevel;

    @Column(name = "observed_symptoms", nullable = true)
    private String observedSymptoms;

    @Column(name = "diagnosis", nullable = true)
    private String diagnosis;

    @Column(name = "treatment_given", nullable = true)
    private String treatmentGiven;

    @Column(name = "next_checkup_date", nullable = true)
    private LocalDate nextCheckupDate;

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

        if (this.fecesStatus == null) {
            this.fecesStatus = FecesStatus.NOT_CHECKED;
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
