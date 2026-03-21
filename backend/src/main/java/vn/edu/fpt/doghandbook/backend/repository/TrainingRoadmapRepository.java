package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.TrainingRoadmap;

import java.util.List;

public interface TrainingRoadmapRepository extends JpaRepository<TrainingRoadmap, Integer> {

    Page<TrainingRoadmap> findByIsDeletedFalse(Pageable pageable);

    Page<TrainingRoadmap> findByStatusAndIsDeletedFalse(vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus status, Pageable pageable);

    @Query("SELECT tr FROM TrainingRoadmap tr WHERE tr.isDeleted = false "
            + "AND tr.dogBreed.breedId = :breedId")
    List<TrainingRoadmap> findByBreedBreedIdAndIsDeletedFalse(@Param("breedId") Integer breedId);
}
