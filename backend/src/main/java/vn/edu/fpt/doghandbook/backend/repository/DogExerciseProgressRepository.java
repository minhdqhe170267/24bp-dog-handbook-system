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
            + "JOIN FETCH dep.roadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "JOIN FETCH re.trainingPhase tp "
            + "WHERE dep.enrollment.enrollmentId = :enrollmentId "
            + "ORDER BY tp.phaseOrder, re.exerciseOrder")
    List<DogExerciseProgress> findByEnrollmentIdWithDetails(@Param("enrollmentId") Integer enrollmentId);

    @Query("SELECT dep FROM DogExerciseProgress dep "
            + "JOIN FETCH dep.roadmapExercise re "
            + "JOIN FETCH re.trainingExercise te "
            + "JOIN FETCH re.trainingPhase tp "
            + "WHERE dep.enrollment.enrollmentId = :enrollmentId "
            + "AND te.exerciseId = :exerciseId")
    Optional<DogExerciseProgress> findByEnrollmentIdAndExerciseId(
            @Param("enrollmentId") Integer enrollmentId,
            @Param("exerciseId") Integer exerciseId
    );

    long countByEnrollmentEnrollmentId(Integer enrollmentId);

    long countByEnrollmentEnrollmentIdAndStatusIn(Integer enrollmentId, Collection<ExerciseProgressStatus> statuses);
}
