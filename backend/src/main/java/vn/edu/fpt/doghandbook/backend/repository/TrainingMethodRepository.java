package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.TrainingMethod;

public interface TrainingMethodRepository extends JpaRepository<TrainingMethod, Integer> {

    Page<TrainingMethod> findByIsDeletedFalse(Pageable pageable);

    Page<TrainingMethod> findByStatusAndIsDeletedFalse(vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus status, Pageable pageable);

    Page<TrainingMethod> findByMethodNameContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);
}
