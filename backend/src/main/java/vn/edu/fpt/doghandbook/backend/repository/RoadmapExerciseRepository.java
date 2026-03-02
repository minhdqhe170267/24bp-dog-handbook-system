package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.RoadmapExercise;

import java.util.List;

public interface RoadmapExerciseRepository extends JpaRepository<RoadmapExercise, Integer> {

    @Query("SELECT re FROM RoadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "WHERE re.trainingRoadmap.roadmapId = :roadmapId "
            + "ORDER BY re.exerciseOrder")
    List<RoadmapExercise> findByRoadmapRoadmapIdOrderByExerciseOrder(@Param("roadmapId") Integer roadmapId);
}
