package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.doghandbook.backend.entity.DogSpecialtyEnrollment;

import java.util.List;
import java.util.Optional;

public interface DogSpecialtyEnrollmentRepository extends JpaRepository<DogSpecialtyEnrollment, Integer> {

    List<DogSpecialtyEnrollment> findByDogProfileDogIdAndIsDeletedFalseOrderByEnrolledAtDesc(Integer dogId);

    List<DogSpecialtyEnrollment> findByTrainerUserIdAndIsDeletedFalseOrderByEnrolledAtDesc(Integer trainerId);

    Optional<DogSpecialtyEnrollment> findByEnrollmentIdAndIsDeletedFalse(Integer enrollmentId);

    Optional<DogSpecialtyEnrollment> findByAssignmentAssignmentIdAndIsDeletedFalse(Integer assignmentId);

    Optional<DogSpecialtyEnrollment> findByDogProfileDogIdAndTrainingSpecialtySpecialtyIdAndIsDeletedFalse(
            Integer dogId,
            Integer specialtyId
    );

    boolean existsByDogProfileDogIdAndTrainingSpecialtySpecialtyIdAndIsDeletedFalse(Integer dogId, Integer specialtyId);

    @Query("SELECT dse FROM DogSpecialtyEnrollment dse "
            + "JOIN FETCH dse.dogProfile dp "
            + "JOIN FETCH dse.trainer t "
            + "JOIN FETCH dse.trainingSpecialty ts "
            + "WHERE dse.enrollmentId = :enrollmentId "
            + "AND dse.isDeleted = false")
    Optional<DogSpecialtyEnrollment> findDetailByEnrollmentId(@Param("enrollmentId") Integer enrollmentId);
}
