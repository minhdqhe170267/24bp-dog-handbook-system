package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.DogTrainingEnrollment;
import vn.edu.fpt.doghandbook.backend.entity.enums.EnrollmentStatus;

import java.util.List;
import java.util.Optional;

public interface DogTrainingEnrollmentRepository extends JpaRepository<DogTrainingEnrollment, Integer> {

    List<DogTrainingEnrollment> findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(Integer dogId);

    List<DogTrainingEnrollment> findByAssignedTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(Integer trainerId);

    Optional<DogTrainingEnrollment> findByEnrollmentIdAndIsDeletedFalse(Integer enrollmentId);

    @Query(value = "SELECT * FROM dog_training_enrollment WHERE enrollment_id = :enrollmentId", nativeQuery = true)
    Optional<DogTrainingEnrollment> findAnyByEnrollmentId(@Param("enrollmentId") Integer enrollmentId);

    Optional<DogTrainingEnrollment> findByDogProfileDogIdAndTrainingRoadmapRoadmapIdAndIsDeletedFalse(
            Integer dogId,
            Integer roadmapId
    );

    boolean existsByDogProfileDogIdAndTrainingRoadmapRoadmapIdAndIsDeletedFalse(Integer dogId, Integer roadmapId);

    boolean existsByTrainingRoadmapRoadmapIdAndIsDeletedFalse(Integer roadmapId);

    long countByStatusAndIsDeletedFalse(EnrollmentStatus status);
}
