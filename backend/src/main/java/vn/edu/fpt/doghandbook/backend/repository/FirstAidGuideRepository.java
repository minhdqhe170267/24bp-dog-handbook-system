package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FirstAidGuideRepository extends JpaRepository<FirstAidGuide, Integer> {

    Page<FirstAidGuide> findByIsDeletedFalse(Pageable pageable);

    Page<FirstAidGuide> findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(String guideTitle, Pageable pageable);

    List<FirstAidGuide> findByGuideTitleContainingIgnoreCaseAndIsDeletedFalse(String keyword);

    Page<FirstAidGuide> findByStatusAndIsDeletedFalse(ContentStatus status, Pageable pageable);

    Page<FirstAidGuide> findByGuideTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
            String guideTitle,
            ContentStatus status,
            Pageable pageable
    );

    Optional<FirstAidGuide> findByGuideIdAndIsDeletedFalse(Integer guideId);

    long countByIsDeletedFalse();

    Page<FirstAidGuide> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime updatedAt,
            Pageable pageable
    );
}
