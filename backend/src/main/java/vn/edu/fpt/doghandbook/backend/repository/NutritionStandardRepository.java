package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;

public interface NutritionStandardRepository extends JpaRepository<NutritionStandard, Integer> {
}
