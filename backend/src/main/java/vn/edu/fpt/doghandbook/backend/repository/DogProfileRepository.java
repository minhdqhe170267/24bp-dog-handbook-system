package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;

public interface DogProfileRepository extends JpaRepository<DogProfile, Integer> {
}
