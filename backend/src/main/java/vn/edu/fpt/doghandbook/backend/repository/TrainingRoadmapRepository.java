package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;

import java.util.List;
import java.util.Optional;

public interface TrainingRoadmapRepository extends JpaRepository<TrainingRoadmap, Integer> {

    Page<TrainingRoadmap> findByIsDeletedFalse(Pageable pageable);

    Page<TrainingRoadmap> findByStatusAndIsDeletedFalse(ContentStatus status, Pageable pageable);

    Optional<TrainingRoadmap> findByRoadmapIdAndIsDeletedFalse(Integer roadmapId);

    Optional<TrainingRoadmap> findByRoadmapNameIgnoreCaseAndIsDeletedFalse(String roadmapName);

    @Query("SELECT tr FROM TrainingRoadmap tr WHERE tr.isDeleted = false "
            + "AND tr.dogBreed.breedId = :breedId")
    List<TrainingRoadmap> findByBreedBreedIdAndIsDeletedFalse(@Param("breedId") Integer breedId);
}
