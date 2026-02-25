package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.ContentSuggestion;

public interface ContentSuggestionRepository extends JpaRepository<ContentSuggestion, Integer> {
}
