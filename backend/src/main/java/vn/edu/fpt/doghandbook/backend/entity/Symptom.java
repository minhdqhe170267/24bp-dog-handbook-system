package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SymptomCategory;

import java.time.LocalDateTime;

@Entity
@Table(name = "symptom")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Symptom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "symptom_id")
    private Integer symptomId;

    @Column(name = "symptom_code", nullable = false, unique = true)
    private String symptomCode;

    @Column(name = "symptom_name", nullable = false)
    private String symptomName;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private SymptomCategory category;

    @Builder.Default
    @Column(name = "severity_indicator", nullable = false)
    private Integer severityIndicator = 1;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.severityIndicator == null) {
            this.severityIndicator = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
