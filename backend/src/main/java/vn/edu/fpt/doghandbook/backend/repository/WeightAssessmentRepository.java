package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;

import java.util.List;

public interface WeightAssessmentRepository extends JpaRepository<WeightAssessment, Integer> {

    List<WeightAssessment> findByDogProfileDogIdOrderByAssessedAtDesc(Integer dogId);
}
