package vn.edu.fpt.doghandbook.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.AttrType;

import java.time.LocalDateTime;

@Entity
@Table(name = "entity_attribute")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntityAttribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attr_id")
    private Integer attrId;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Integer entityId;

    @Column(name = "attr_key", nullable = false)
    private String attrKey;

    @Column(name = "attr_value", nullable = true)
    private String attrValue;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "attr_type", nullable = false)
    private AttrType attrType = AttrType.TEXT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.attrType == null) {
            this.attrType = AttrType.TEXT;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
