package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;

import java.util.Optional;

public interface DogBreedRepository extends JpaRepository<DogBreed, Integer> {

    Optional<DogBreed> findByBreedIdAndIsDeletedFalse(Integer breedId);
}
