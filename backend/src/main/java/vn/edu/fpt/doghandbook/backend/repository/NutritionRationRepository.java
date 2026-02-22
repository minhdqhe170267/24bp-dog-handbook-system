package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.NutritionRation;

import java.util.List;
import java.util.Optional;

/**
 * Repository for nutrition rations.
 */
@Repository
public interface NutritionRationRepository extends JpaRepository<NutritionRation, Long> {

    /**
     * Get nutrition ration rows by breed.
     */
    @Query("""
            select nr
            from NutritionRation nr
            join fetch nr.nutritionStandard ns
            join fetch ns.dogBreed db
            where db.id = :breedId
              and db.isDeleted = false
              and ns.isDeleted = false
              and nr.isDeleted = false
              and upper(ns.status) in ('APPROVED', 'PUBLISHED')
              and upper(nr.status) in ('APPROVED', 'PUBLISHED')
            order by ns.id asc, nr.displayOrder asc, nr.id asc
            """)
    List<NutritionRation> findByBreedId(@Param("breedId") Long breedId);

    /**
     * Get nutrition ration rows by standard for trainer/mobile.
     */
    @Query("""
            select nr
            from NutritionRation nr
            join fetch nr.nutritionStandard ns
            join fetch ns.dogBreed db
            where ns.id = :standardId
              and db.isDeleted = false
              and ns.isDeleted = false
              and nr.isDeleted = false
              and upper(ns.status) in ('APPROVED', 'PUBLISHED')
              and upper(nr.status) in ('APPROVED', 'PUBLISHED')
            order by nr.displayOrder asc, nr.id asc
            """)
    List<NutritionRation> findTrainerByStandardId(@Param("standardId") Long standardId);

    /**
     * Get nutrition ration rows by standard for CMS.
     */
    @Query("""
            select nr
            from NutritionRation nr
            join fetch nr.nutritionStandard ns
            join fetch ns.dogBreed db
            where ns.id = :standardId
              and db.isDeleted = false
              and ns.isDeleted = false
              and nr.isDeleted = false
            order by nr.displayOrder asc, nr.id asc
            """)
    List<NutritionRation> findCmsByStandardId(@Param("standardId") Long standardId);

    @Query("""
            select nr
            from NutritionRation nr
            join fetch nr.nutritionStandard ns
            join fetch ns.dogBreed db
            where nr.id = :rationId
              and nr.isDeleted = false
              and ns.isDeleted = false
              and db.isDeleted = false
            """)
    Optional<NutritionRation> findActiveById(@Param("rationId") Long rationId);

    @Query("""
            select nr
            from NutritionRation nr
            where nr.nutritionStandard.id = :standardId
              and nr.isDeleted = false
            """)
    List<NutritionRation> findActiveByStandardId(@Param("standardId") Long standardId);
}
