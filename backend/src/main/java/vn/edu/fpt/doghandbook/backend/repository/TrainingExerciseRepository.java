package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;

import java.time.LocalDateTime;
import java.util.List;

public interface TrainingExerciseRepository extends JpaRepository<TrainingExercise, Integer> {

    Page<TrainingExercise> findByIsDeletedFalse(Pageable pageable);

    Page<TrainingExercise> findByDifficultyLevelAndIsDeletedFalse(DifficultyLevel level, Pageable pageable);

    Page<TrainingExercise> findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    List<TrainingExercise> findByExerciseNameContainingIgnoreCaseAndIsDeletedFalse(String keyword);

    @Query("SELECT te FROM TrainingExercise te WHERE te.isDeleted = false "
            + "AND te.trainingMethod.methodId = :methodId")
    List<TrainingExercise> findByMethodMethodIdAndIsDeletedFalse(@Param("methodId") Integer methodId);

    long countByIsDeletedFalse();

    Page<TrainingExercise> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime updatedAt,
            Pageable pageable
    );
}
