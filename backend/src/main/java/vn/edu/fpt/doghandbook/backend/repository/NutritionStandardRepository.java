package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;

import java.util.List;
import java.util.Optional;

public interface NutritionStandardRepository extends JpaRepository<NutritionStandard, Integer> {

    Page<NutritionStandard> findByIsDeletedFalse(Pageable pageable);

    Page<NutritionStandard> findByRationNameContainingIgnoreCaseAndIsDeletedFalse(
            String keyword,
            Pageable pageable
    );

    @Query("SELECT ns FROM NutritionStandard ns WHERE ns.isDeleted = false AND ns.dogBreed.breedId = :breedId")
    List<NutritionStandard> findByBreedBreedIdAndIsDeletedFalse(@Param("breedId") Integer breedId);

    @Query("SELECT ns FROM NutritionStandard ns WHERE ns.isDeleted = false "
            + "AND (ns.dogBreed.breedId = :breedId OR ns.dogBreed IS NULL) "
            + "AND ns.activityLevel = :activityLevel "
            + "AND ns.targetAgeMinMonths <= :ageMonths "
            + "AND (ns.targetAgeMaxMonths >= :ageMonths OR ns.targetAgeMaxMonths IS NULL) "
            + "ORDER BY ns.dogBreed.breedId DESC NULLS LAST")
    List<NutritionStandard> findMatchingStandards(
            @Param("breedId") Integer breedId,
            @Param("activityLevel") ActivityLevel activityLevel,
            @Param("ageMonths") Integer ageMonths
    );

    Optional<NutritionStandard> findByRationCodeAndIsDeletedFalse(String rationCode);

    boolean existsByRationCodeAndIsDeletedFalse(String rationCode);
}
