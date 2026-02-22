package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;

import java.util.List;
import java.util.Optional;

/**
 * Repository for nutrition standards.
 */
@Repository
public interface NutritionStandardRepository extends JpaRepository<NutritionStandard, Long> {

    /**
     * Get all published nutrition standards for trainer/mobile.
     */
    @Query("""
            select ns
            from NutritionStandard ns
            join fetch ns.dogBreed db
            where ns.isDeleted = false
              and db.isDeleted = false
              and upper(ns.status) in ('APPROVED', 'PUBLISHED')
              and (:keyword is null
                   or upper(ns.rationCode) like concat('%', upper(:keyword), '%')
                   or upper(ns.rationName) like concat('%', upper(:keyword), '%'))
              and (:activityLevel is null or upper(ns.activityLevel) = upper(:activityLevel))
              and (:weightKg is null
                   or ((ns.targetWeightMinKg is null or ns.targetWeightMinKg <= :weightKg)
                       and (ns.targetWeightMaxKg is null or ns.targetWeightMaxKg >= :weightKg)))
              and (:ageMonths is null
                   or ((ns.targetAgeMinMonths is null or ns.targetAgeMinMonths <= :ageMonths)
                       and (ns.targetAgeMaxMonths is null or ns.targetAgeMaxMonths >= :ageMonths)))
            order by ns.id asc
            """)
    List<NutritionStandard> findTrainerStandards(
            @Param("keyword") String keyword,
            @Param("activityLevel") String activityLevel,
            @Param("weightKg") Double weightKg,
            @Param("ageMonths") Integer ageMonths
    );

    /**
     * Get one published standard by id for trainer/mobile.
     */
    @Query("""
            select ns
            from NutritionStandard ns
            join fetch ns.dogBreed db
            where ns.id = :standardId
              and ns.isDeleted = false
              and db.isDeleted = false
              and upper(ns.status) in ('APPROVED', 'PUBLISHED')
            """)
    Optional<NutritionStandard> findTrainerStandardById(@Param("standardId") Long standardId);

    /**
     * List standards for CMS.
     */
    @Query("""
            select ns
            from NutritionStandard ns
            join fetch ns.dogBreed db
            where ns.isDeleted = false
              and db.isDeleted = false
              and (:keyword is null
                   or upper(ns.rationCode) like concat('%', upper(:keyword), '%')
                   or upper(ns.rationName) like concat('%', upper(:keyword), '%'))
              and (:activityLevel is null or upper(ns.activityLevel) = upper(:activityLevel))
              and (:status is null or upper(ns.status) = upper(:status))
            order by ns.id desc
            """)
    List<NutritionStandard> findCmsStandards(
            @Param("keyword") String keyword,
            @Param("activityLevel") String activityLevel,
            @Param("status") String status
    );

    /**
     * Get one standard by id for CMS.
     */
    @Query("""
            select ns
            from NutritionStandard ns
            join fetch ns.dogBreed db
            where ns.id = :standardId
              and ns.isDeleted = false
              and db.isDeleted = false
            """)
    Optional<NutritionStandard> findCmsStandardById(@Param("standardId") Long standardId);

    boolean existsByRationCodeIgnoreCaseAndIsDeletedFalse(String rationCode);

    boolean existsByRationCodeIgnoreCaseAndIsDeletedFalseAndIdNot(String rationCode, Long id);
}
