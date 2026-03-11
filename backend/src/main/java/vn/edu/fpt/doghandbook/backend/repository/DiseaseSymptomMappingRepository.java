package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;

import java.util.List;

public interface DiseaseSymptomMappingRepository extends JpaRepository<DiseaseSymptomMapping, Integer> {

    List<DiseaseSymptomMapping> findByDisease(Disease disease);

    List<DiseaseSymptomMapping> findBySymptomSymptomIdIn(List<Integer> symptomIds);

    void deleteByDiseaseDiseaseId(Integer diseaseId);
}
