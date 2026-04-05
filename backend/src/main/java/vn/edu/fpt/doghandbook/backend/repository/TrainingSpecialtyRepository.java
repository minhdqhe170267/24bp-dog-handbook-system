package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.TrainingSpecialty;

import java.util.Optional;

public interface TrainingSpecialtyRepository extends JpaRepository<TrainingSpecialty, Integer> {

    Page<TrainingSpecialty> findByIsDeletedFalse(Pageable pageable);

    Page<TrainingSpecialty> findBySpecialtyNameContainingIgnoreCaseAndIsDeletedFalse(String specialtyName, Pageable pageable);

    Optional<TrainingSpecialty> findBySpecialtyIdAndIsDeletedFalse(Integer specialtyId);

    Optional<TrainingSpecialty> findBySpecialtyCodeIgnoreCaseAndIsDeletedFalse(String specialtyCode);
}
