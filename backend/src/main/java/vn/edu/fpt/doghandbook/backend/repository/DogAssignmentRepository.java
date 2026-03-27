package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface DogAssignmentRepository extends JpaRepository<DogAssignment, Integer> {

    List<DogAssignment> findByTrainerUserIdAndIsActiveTrue(Integer trainerId);

    List<DogAssignment> findByDogProfileDogIdAndIsActiveTrue(Integer dogId);

    List<DogAssignment> findByTrainerUserId(Integer trainerId);

    List<DogAssignment> findByDogProfileDogId(Integer dogId);

    List<DogAssignment> findByCoveredAssignmentAssignmentIdAndIsActiveTrue(Integer assignmentId);

    boolean existsByDogProfileDogIdAndTrainerUserIdAndIsActiveTrue(Integer dogId, Integer trainerId);

    @Query("""
            SELECT a FROM DogAssignment a
            WHERE a.trainer.userId = :trainerId
              AND a.isActive = true
              AND a.startDate <= :targetDate
              AND (a.endDate IS NULL OR a.endDate >= :targetDate)
            ORDER BY a.startDate DESC, a.assignmentId DESC
            """)
    List<DogAssignment> findEffectiveByTrainerUserId(
            @Param("trainerId") Integer trainerId,
            @Param("targetDate") LocalDate targetDate);

    @Query("""
            SELECT a FROM DogAssignment a
            WHERE a.dogProfile.dogId = :dogId
              AND a.isActive = true
              AND a.startDate <= :targetDate
              AND (a.endDate IS NULL OR a.endDate >= :targetDate)
            ORDER BY a.startDate DESC, a.assignmentId DESC
            """)
    List<DogAssignment> findEffectiveByDogProfileDogId(
            @Param("dogId") Integer dogId,
            @Param("targetDate") LocalDate targetDate);

    // Escalation: find dogs with many assignment changes in recent period
    @Query("SELECT a.dogProfile.dogId, COUNT(a) FROM DogAssignment a " +
            "WHERE a.createdAt >= :since GROUP BY a.dogProfile.dogId HAVING COUNT(a) >= :threshold")
    List<Object[]> findDogsWithFrequentReassignment(
            @Param("since") LocalDateTime since, @Param("threshold") long threshold);
}
