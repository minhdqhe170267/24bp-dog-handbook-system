package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.WeightAssessment;

import java.util.List;
import java.util.Optional;

public interface WeightAssessmentRepository extends JpaRepository<WeightAssessment, Integer> {

    List<WeightAssessment> findByDogProfileDogIdOrderByAssessedAtDesc(Integer dogId);

    Optional<WeightAssessment> findByLocalId(String localId);
}
