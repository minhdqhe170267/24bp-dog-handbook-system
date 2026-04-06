package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DiseaseFirstAidMapping;

import java.util.List;

public interface DiseaseFirstAidMappingRepository extends JpaRepository<DiseaseFirstAidMapping, Integer> {

    List<DiseaseFirstAidMapping> findByDisease(Disease disease);

    List<DiseaseFirstAidMapping> findByDiseaseDiseaseIdIn(List<Integer> diseaseIds);

    void deleteByDiseaseDiseaseId(Integer diseaseId);
}
