package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Symptom;
import vn.edu.fpt.doghandbook.backend.entity.enums.SymptomCategory;

import java.util.List;

public interface SymptomRepository extends JpaRepository<Symptom, Integer> {

    List<Symptom> findBySymptomIdIn(List<Integer> ids);

    List<Symptom> findByCategory(SymptomCategory category);
}
