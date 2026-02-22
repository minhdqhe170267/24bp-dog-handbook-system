package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;

import java.util.Optional;

/**
 * Repository for dog breed reference data.
 */
@Repository
public interface DogBreedRepository extends JpaRepository<DogBreed, Long> {

    Optional<DogBreed> findByIdAndIsDeletedFalse(Long id);
}
