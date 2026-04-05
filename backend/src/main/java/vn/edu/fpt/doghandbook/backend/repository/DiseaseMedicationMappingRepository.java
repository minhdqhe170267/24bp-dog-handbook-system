package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseMedicationMapping;

import java.util.List;

public interface DiseaseMedicationMappingRepository extends JpaRepository<DiseaseMedicationMapping, Integer> {

    List<DiseaseMedicationMapping> findByDisease(Disease disease);

    List<DiseaseMedicationMapping> findByDiseaseDiseaseIdIn(List<Integer> diseaseIds);

    void deleteByDiseaseDiseaseId(Integer diseaseId);
}
