package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.*;

import java.util.List;

@Repository
public interface NutritionPlanRepository extends JpaRepository<NutritionPlan, Long> {

    List<NutritionPlan> findByStatus(ContentStatus status);

    List<NutritionPlan> findByDogCategory(DogCategory dogCategory);

    List<NutritionPlan> findByActivityLevel(ActivityLevel activityLevel);

    @Query("SELECT np FROM NutritionPlan np WHERE np.status = :status " +
           "AND (:dogCategory IS NULL OR np.dogCategory = :dogCategory) " +
           "AND (:activityLevel IS NULL OR np.activityLevel = :activityLevel)")
    List<NutritionPlan> findByFilters(
            @Param("status") ContentStatus status,
            @Param("dogCategory") DogCategory dogCategory,
            @Param("activityLevel") ActivityLevel activityLevel
    );

    /**
     * Tìm kế hoạch phù hợp theo cân nặng và tuổi
     */
    @Query("SELECT np FROM NutritionPlan np WHERE np.status = 'APPROVED' " +
           "AND np.minWeight <= :weight AND np.maxWeight >= :weight " +
           "AND np.minAgeMonths <= :ageMonths AND np.maxAgeMonths >= :ageMonths")
    List<NutritionPlan> findSuitablePlans(
            @Param("weight") Double weight,
            @Param("ageMonths") Integer ageMonths
    );

    /**
     * Tìm kiếm theo tên
     */
    List<NutritionPlan> findByNameContainingIgnoreCaseAndStatus(String name, ContentStatus status);
}
