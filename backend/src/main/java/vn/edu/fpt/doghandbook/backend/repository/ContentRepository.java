package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.Content;

public interface ContentRepository extends JpaRepository<Content, Integer> {
}
