package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface DiseaseRepository extends JpaRepository<Disease, Integer> {

    long countByIsDeletedFalse();

    Page<Disease> findByDiseaseNameContainingIgnoreCase(String diseaseName, Pageable pageable);

    List<Disease> findByDiseaseNameContainingIgnoreCaseAndIsDeletedFalse(String keyword);

    Page<Disease> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime updatedAt,
            Pageable pageable
    );
}
