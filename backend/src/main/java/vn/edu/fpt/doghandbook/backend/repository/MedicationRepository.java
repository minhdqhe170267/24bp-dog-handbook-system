package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;

import java.time.LocalDateTime;
import java.util.Optional;

public interface MedicationRepository extends JpaRepository<Medication, Integer> {

    Page<Medication> findByIsDeletedFalse(Pageable pageable);

    Page<Medication> findByMedicationNameContainingIgnoreCaseAndIsDeletedFalse(String medicationName, Pageable pageable);

    Page<Medication> findByStatusAndIsDeletedFalse(ContentStatus status, Pageable pageable);

    Page<Medication> findByMedicationNameContainingIgnoreCaseAndStatusAndIsDeletedFalse(
            String medicationName,
            ContentStatus status,
            Pageable pageable
    );

    Optional<Medication> findByMedicationIdAndIsDeletedFalse(Integer medicationId);

    long countByIsDeletedFalse();

    long countByStatusAndIsDeletedFalse(ContentStatus status);

    long countByStatusAndCreatedAtBetweenAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime start,
            LocalDateTime end
    );

    Page<Medication> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime updatedAt,
            Pageable pageable
    );
}
