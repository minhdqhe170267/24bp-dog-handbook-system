package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.FieldNote;

import java.util.Optional;

public interface FieldNoteRepository extends JpaRepository<FieldNote, Integer> {

    Page<FieldNote> findByIsDeletedFalseOrderByRecordingDateDesc(Pageable pageable);

    Page<FieldNote> findByTitleContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    Page<FieldNote> findByTrainerUserIdAndIsDeletedFalseOrderByRecordingDateDesc(Integer trainerId, Pageable pageable);

    Page<FieldNote> findByDogProfileDogIdAndIsDeletedFalseOrderByRecordingDateDesc(Integer dogId, Pageable pageable);

    Optional<FieldNote> findByNoteIdAndIsDeletedFalse(Integer noteId);
}
