package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "diagnosis_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiagnosisRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "diagnosis_id")
    private Integer diagnosisId;

    @Column(name = "local_id", length = 36, unique = true)
    private String localId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dog_id", nullable = false)
    private DogProfile dogProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    @Column(name = "selected_symptoms", columnDefinition = "json", nullable = false)
    private String selectedSymptoms;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_disease_id", nullable = true)
    private Disease matchedDisease;

    @Column(name = "match_score", precision = 5, scale = 2, nullable = true)
    private BigDecimal matchScore;

    @Column(name = "all_results", columnDefinition = "json", nullable = true)
    private String allResults;

    @Column(name = "action_taken", nullable = true)
    private String actionTaken;

    @Column(name = "diagnosed_at", nullable = false)
    private LocalDateTime diagnosedAt;

    @PrePersist
    protected void onCreate() {
        if (this.diagnosedAt == null) {
            this.diagnosedAt = LocalDateTime.now();
        }
    }
}
