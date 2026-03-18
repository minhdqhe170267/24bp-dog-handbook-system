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
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionType;

import java.time.LocalDateTime;

@Entity
@Table(name = "content_suggestion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "suggestion_id")
    private Integer suggestionId;

    @Column(name = "local_id", length = 36, unique = true)
    private String localId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggestion_type", nullable = false)
    private SuggestionType suggestionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_exercise_id", nullable = true)
    private TrainingExercise relatedExercise;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", nullable = false)
    private String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SuggestionStatus status = SuggestionStatus.SUBMITTED;

    @Column(name = "admin_response", nullable = true)
    private String adminResponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", nullable = true)
    private User reviewedBy;

    @Column(name = "reviewed_at", nullable = true)
    private LocalDateTime reviewedAt;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) {
            this.status = SuggestionStatus.SUBMITTED;
        }
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
    }
}
