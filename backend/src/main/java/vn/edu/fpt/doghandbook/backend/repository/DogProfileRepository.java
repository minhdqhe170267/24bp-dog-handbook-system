package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;

import java.util.Optional;

public interface DogProfileRepository extends JpaRepository<DogProfile, Integer> {

    Page<DogProfile> findByIsDeletedFalse(Pageable pageable);

    Page<DogProfile> findByDogNameContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    Optional<DogProfile> findByDogIdAndIsDeletedFalse(Integer dogId);

    boolean existsByDogCode(String dogCode);
}
