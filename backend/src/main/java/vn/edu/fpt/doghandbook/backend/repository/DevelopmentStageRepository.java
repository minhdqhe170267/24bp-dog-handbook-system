package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DevelopmentStage;

public interface DevelopmentStageRepository extends JpaRepository<DevelopmentStage, Integer> {
}
