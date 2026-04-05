package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;

import java.util.List;

public interface RoadmapExerciseRepository extends JpaRepository<RoadmapExercise, Integer> {

    @Query("SELECT re FROM RoadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "JOIN FETCH re.trainingPhase tp "
            + "WHERE tp.phaseId = :phaseId "
            + "ORDER BY re.exerciseOrder")
    List<RoadmapExercise> findByTrainingPhasePhaseIdOrderByExerciseOrder(@Param("phaseId") Integer phaseId);

    @Query("SELECT re FROM RoadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "JOIN FETCH re.trainingPhase tp "
            + "JOIN FETCH tp.trainingRoadmap tr "
            + "WHERE tr.roadmapId = :roadmapId "
            + "AND tp.isDeleted = false "
            + "ORDER BY tp.phaseOrder, re.exerciseOrder")
    List<RoadmapExercise> findByRoadmapRoadmapIdOrderByPhaseOrderAndExerciseOrder(@Param("roadmapId") Integer roadmapId);

    @Query("SELECT re FROM RoadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "JOIN FETCH re.trainingPhase tp "
            + "JOIN FETCH tp.trainingRoadmap tr "
            + "JOIN FETCH tr.trainingSpecialty ts "
            + "WHERE ts.specialtyId = :specialtyId "
            + "AND tp.isDeleted = false "
            + "AND tr.isDeleted = false "
            + "ORDER BY tr.roadmapOrder, tp.phaseOrder, re.exerciseOrder")
    List<RoadmapExercise> findBySpecialtyIdOrderByRoadmapOrderAndPhaseOrderAndExerciseOrder(
            @Param("specialtyId") Integer specialtyId
    );
}
