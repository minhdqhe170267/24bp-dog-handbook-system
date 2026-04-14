package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.TrainingPhase;

import java.util.List;
import java.util.Optional;

public interface TrainingPhaseRepository extends JpaRepository<TrainingPhase, Integer> {

    List<TrainingPhase> findByTrainingRoadmapRoadmapIdAndIsDeletedFalseOrderByPhaseOrderAsc(Integer roadmapId);

    Optional<TrainingPhase> findByPhaseIdAndIsDeletedFalse(Integer phaseId);
}
