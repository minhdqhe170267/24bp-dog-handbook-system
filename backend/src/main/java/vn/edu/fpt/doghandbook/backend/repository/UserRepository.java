package vn.edu.fpt.doghandbook.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.doghandbook.backend.entity.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
    long countByIsDeletedFalse();
    Page<User> findByIsDeletedFalse(Pageable pageable);
    Page<User> findByFullNameContainingIgnoreCaseAndIsDeletedFalse(String fullName, Pageable pageable);
    Optional<User> findByUserIdAndIsDeletedFalse(Integer userId);
}
