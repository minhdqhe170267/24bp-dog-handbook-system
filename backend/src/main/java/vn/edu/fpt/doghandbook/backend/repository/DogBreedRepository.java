package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;

import java.util.List;
import java.util.Optional;

public interface DogBreedRepository extends JpaRepository<DogBreed, Integer> {

    Page<DogBreed> findByIsDeletedFalse(Pageable pageable);

    Page<DogBreed> findByBreedNameContainingIgnoreCaseAndIsDeletedFalse(String keyword, Pageable pageable);

    Optional<DogBreed> findByBreedIdAndIsDeletedFalse(Integer breedId);

    Optional<DogBreed> findByBreedNameAndIsDeletedFalse(String breedName);

    boolean existsByBreedNameAndIsDeletedFalse(String breedName);

    List<DogBreed> findByBreedIdInAndIsDeletedFalse(List<Integer> ids);
    Optional<DogBreed> findByBreedIdAndIsDeletedFalse(Integer breedId);
}
