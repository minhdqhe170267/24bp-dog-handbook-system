package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Media;

import java.util.List;

public interface MediaRepository extends JpaRepository<Media, Integer> {

    List<Media> findByContentContentIdAndIsDeletedFalseOrderByDisplayOrder(Integer contentId);

    long countByUploadedByUserIdAndIsDeletedFalse(Integer userId);
}
