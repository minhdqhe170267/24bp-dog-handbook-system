package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.EntityAttribute;

public interface EntityAttributeRepository extends JpaRepository<EntityAttribute, Integer> {
}
