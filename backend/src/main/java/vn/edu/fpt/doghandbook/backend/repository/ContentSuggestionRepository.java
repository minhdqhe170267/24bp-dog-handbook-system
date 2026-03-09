package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.ContentSuggestion;
import vn.edu.fpt.doghandbook.backend.entity.enums.SuggestionStatus;

import java.util.List;

public interface ContentSuggestionRepository extends JpaRepository<ContentSuggestion, Integer> {

    Page<ContentSuggestion> findByOrderBySubmittedAtDesc(Pageable pageable);

    Page<ContentSuggestion> findByStatusOrderBySubmittedAtDesc(SuggestionStatus status, Pageable pageable);

    List<ContentSuggestion> findByTrainerUserIdOrderBySubmittedAtDesc(Integer trainerId);

    long countByStatus(SuggestionStatus status);
}
