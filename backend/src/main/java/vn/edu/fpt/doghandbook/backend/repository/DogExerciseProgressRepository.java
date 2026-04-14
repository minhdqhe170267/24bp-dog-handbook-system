package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.DogExerciseProgress;
import vn.edu.fpt.doghandbook.backend.entity.enums.ExerciseProgressStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DogExerciseProgressRepository extends JpaRepository<DogExerciseProgress, Integer> {

    @Query("SELECT dep FROM DogExerciseProgress dep "
            + "LEFT JOIN FETCH dep.evaluatedBy eb "
            + "WHERE dep.enrollment.enrollmentId = :enrollmentId "
            + "ORDER BY dep.roadmapOrder, dep.phaseOrder, dep.exerciseOrder")
    List<DogExerciseProgress> findByEnrollmentIdWithDetails(@Param("enrollmentId") Integer enrollmentId);

    @Query("SELECT dep FROM DogExerciseProgress dep "
            + "JOIN FETCH dep.enrollment dse "
            + "LEFT JOIN FETCH dep.evaluatedBy eb "
            + "WHERE dep.progressId = :progressId")
    Optional<DogExerciseProgress> findDetailByProgressId(@Param("progressId") Integer progressId);

    long countByEnrollmentEnrollmentId(Integer enrollmentId);

    long countByEnrollmentEnrollmentIdAndStatusIn(
            Integer enrollmentId,
            Collection<ExerciseProgressStatus> statuses
    );
}
