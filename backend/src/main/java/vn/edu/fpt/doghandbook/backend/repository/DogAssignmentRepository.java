package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;

import java.time.LocalDateTime;
import java.util.List;

public interface DogAssignmentRepository extends JpaRepository<DogAssignment, Integer> {

    List<DogAssignment> findByTrainerUserIdAndIsActiveTrue(Integer trainerId);

    List<DogAssignment> findByDogProfileDogIdAndIsActiveTrue(Integer dogId);

    List<DogAssignment> findByTrainerUserId(Integer trainerId);

    List<DogAssignment> findByDogProfileDogId(Integer dogId);

    boolean existsByDogProfileDogIdAndTrainerUserIdAndIsActiveTrue(Integer dogId, Integer trainerId);

    // Escalation: find dogs with many assignment changes in recent period
    @Query("SELECT a.dogProfile.dogId, COUNT(a) FROM DogAssignment a " +
            "WHERE a.createdAt >= :since GROUP BY a.dogProfile.dogId HAVING COUNT(a) >= :threshold")
    List<Object[]> findDogsWithFrequentReassignment(
            @Param("since") LocalDateTime since, @Param("threshold") long threshold);
}
