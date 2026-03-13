package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogAssignment;

import java.util.List;

public interface DogAssignmentRepository extends JpaRepository<DogAssignment, Integer> {

    List<DogAssignment> findByTrainerUserIdAndIsActiveTrue(Integer trainerId);

    List<DogAssignment> findByDogProfileDogIdAndIsActiveTrue(Integer dogId);

    List<DogAssignment> findByTrainerUserId(Integer trainerId);

    List<DogAssignment> findByDogProfileDogId(Integer dogId);

    boolean existsByDogProfileDogIdAndTrainerUserIdAndIsActiveTrue(Integer dogId, Integer trainerId);
}
