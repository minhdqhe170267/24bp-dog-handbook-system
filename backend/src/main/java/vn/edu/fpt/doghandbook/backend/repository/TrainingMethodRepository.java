package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;

public interface TrainingMethodRepository extends JpaRepository<TrainingMethod, Integer> {
}
