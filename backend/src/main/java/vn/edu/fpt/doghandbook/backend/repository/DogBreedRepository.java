package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;

public interface DogBreedRepository extends JpaRepository<DogBreed, Integer> {
}
