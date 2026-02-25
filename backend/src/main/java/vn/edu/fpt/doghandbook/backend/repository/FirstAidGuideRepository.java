package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.FirstAidGuide;

public interface FirstAidGuideRepository extends JpaRepository<FirstAidGuide, Integer> {
}
