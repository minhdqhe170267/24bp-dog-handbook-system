package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DevelopmentStage;

import java.util.List;

public interface DevelopmentStageRepository extends JpaRepository<DevelopmentStage, Integer> {

    List<DevelopmentStage> findByDogBreedBreedIdAndIsDeletedFalseOrderByStageOrder(Integer breedId);

    List<DevelopmentStage> findByIsDeletedFalseOrderByDogBreedBreedIdAscStageOrderAsc();

    org.springframework.data.domain.Page<DevelopmentStage> findByStatusAndIsDeletedFalse(
            vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus status,
            org.springframework.data.domain.Pageable pageable);
}
