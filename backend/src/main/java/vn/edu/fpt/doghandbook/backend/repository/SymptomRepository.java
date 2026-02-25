package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;

public interface SymptomRepository extends JpaRepository<Symptom, Integer> {
}
