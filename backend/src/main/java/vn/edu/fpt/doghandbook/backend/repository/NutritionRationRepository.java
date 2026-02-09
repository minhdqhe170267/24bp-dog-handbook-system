package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.NutritionRation;

import java.util.List;

/**
 * Repository for nutrition rations.
 */
@Repository
public interface NutritionRationRepository extends JpaRepository<NutritionRation, Long> {

    /**
     * Find rations by breed with optional age and weight filtering.
     */
    @Query("""
            select distinct nr
            from NutritionRation nr
            join fetch nr.nutritionStandard ns
            join fetch nr.dogBreed db
            where db.id = :breedId
              and (:ageMonths is null
                   or ((ns.minAgeMonth is null or ns.minAgeMonth <= :ageMonths)
                       and (ns.maxAgeMonth is null or ns.maxAgeMonth >= :ageMonths)))
              and (:weightKg is null
                   or ((ns.minWeight is null or ns.minWeight <= :weightKg)
                       and (ns.maxWeight is null or ns.maxWeight >= :weightKg)))
            """)
    List<NutritionRation> findByBreedAndOptionalRanges(
            @Param("breedId") Long breedId,
            @Param("ageMonths") Integer ageMonths,
            @Param("weightKg") Double weightKg
    );
}
