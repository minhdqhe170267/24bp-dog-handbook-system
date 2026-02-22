package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Dog breed reference entity (read-only for Nutrition module).
 */
@Entity
@Table(name = "dog_breed")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DogBreed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "breed_id")
    private Long id;

    @Column(name = "breed_name", nullable = false)
    private String breedName;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;
}
