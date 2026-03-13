package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Content;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentType;

import java.util.List;

public interface ContentRepository extends JpaRepository<Content, Integer> {

    Page<Content> findByIsDeletedFalse(Pageable pageable);

    Page<Content> findByTitleContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    Page<Content> findByContentTypeAndIsDeletedFalse(ContentType type, Pageable pageable);

    Page<Content> findByStatusAndIsDeletedFalse(ContentStatus status, Pageable pageable);

    Page<Content> findByContentTypeAndStatusAndIsDeletedFalse(
            ContentType type,
            ContentStatus status,
            Pageable pageable
    );

    Page<Content> findByTitleContainingIgnoreCaseAndStatusAndIsDeletedFalse(
            String keyword,
            ContentStatus status,
            Pageable pageable
    );

    Page<Content> findByTitleContainingIgnoreCaseAndContentTypeAndIsDeletedFalse(
            String keyword,
            ContentType type,
            Pageable pageable
    );

    Page<Content> findByTitleContainingIgnoreCaseAndContentTypeAndStatusAndIsDeletedFalse(
            String keyword,
            ContentType type,
            ContentStatus status,
            Pageable pageable
    );

    List<Content> findByAuthorUserIdAndIsDeletedFalse(Integer authorId);

    long countByStatusAndIsDeletedFalse(ContentStatus status);

    long countByStatusAndPublishedAtBetweenAndIsDeletedFalse(
            ContentStatus status,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end
    );

    Page<Content> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            java.time.LocalDateTime updatedAt,
            Pageable pageable
    );
}
