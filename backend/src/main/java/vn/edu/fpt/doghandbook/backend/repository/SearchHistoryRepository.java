package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.SearchHistory;

import java.util.List;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Integer> {

    List<SearchHistory> findTop10ByUserUserIdOrderBySearchedAtDesc(Integer userId);
}
