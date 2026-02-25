package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;

/**
 * Repository for nutrition standards.
 */
@Repository
public interface NutritionStandardRepository extends JpaRepository<NutritionStandard, Long> {
}
