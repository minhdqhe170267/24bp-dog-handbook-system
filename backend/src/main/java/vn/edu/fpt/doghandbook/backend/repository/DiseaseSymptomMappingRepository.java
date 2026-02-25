package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseSymptomMapping;

public interface DiseaseSymptomMappingRepository extends JpaRepository<DiseaseSymptomMapping, Integer> {
}
