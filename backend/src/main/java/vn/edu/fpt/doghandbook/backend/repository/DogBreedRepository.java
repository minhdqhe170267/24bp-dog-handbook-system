package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DogBreedRepository extends JpaRepository<DogBreed, Integer> {

    Page<DogBreed> findByIsDeletedFalse(Pageable pageable);

    Page<DogBreed> findByStatusAndIsDeletedFalse(ContentStatus status, Pageable pageable);

    Page<DogBreed> findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    List<DogBreed> findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(String keyword);

    Optional<DogBreed> findByBreedIdAndIsDeletedFalse(Integer breedId);

    Optional<DogBreed> findByBreedNameAndIsDeletedFalse(String breedName);

    boolean existsByBreedNameAndIsDeletedFalse(String breedName);

    List<DogBreed> findByBreedIdInAndIsDeletedFalse(List<Integer> ids);

    long countByIsDeletedFalse();

    Page<DogBreed> findByStatusAndUpdatedAtAfterAndIsDeletedFalse(
            ContentStatus status,
            LocalDateTime updatedAt,
            Pageable pageable
    );
}
