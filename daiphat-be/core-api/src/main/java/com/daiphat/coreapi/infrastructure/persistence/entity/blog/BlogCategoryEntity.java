package com.daiphat.coreapi.infrastructure.persistence.entity.blog;

import com.daiphat.coreapi.domain.model.enums.blog.CategoryStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Entity
@Table(name = "blog_category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BlogCategoryEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private BlogCategoryEntity parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    private List<BlogCategoryEntity> children;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    private String description;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CategoryStatus status = CategoryStatus.ACTIVE;

    @Column(name = "avatar")
    private String avatar;
}
