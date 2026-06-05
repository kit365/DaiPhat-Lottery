package com.daiphat.coreapi.infrastructure.persistence.specification;

import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity_;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specification cho bài viết blog – dùng trong trang quản trị.
 * Sử dụng static metamodel để đảm bảo type-safety tại compile time.
 * Hỗ trợ:
 *  - Tìm kiếm theo title (ILIKE)
 *  - Lọc theo tag (id)
 *  - Lọc theo category (id)
 *  - Lọc theo loại bài (type)
 *  - Lọc theo trạng thái (status)
 *  - Lọc bài chưa bị xoá mềm
 */
public class BlogPostSpecification {

    private BlogPostSpecification() {}

    /**
     * @param search         Tìm kiếm theo tiêu đề (nullable)
     * @param tagId          Lọc theo id của tag (nullable)
     * @param categoryId     Lọc theo id của category (nullable)
     * @param type           Lọc theo loại bài (nullable) – nhận code string, vd: "blog", "news"
     * @param status         Lọc theo trạng thái (nullable) – nhận code string, vd: "draft", "published"
     * @param includeDeleted Nếu false, chỉ lấy bài chưa bị xoá mềm
     */
    public static Specification<BlogPostEntity> filter(
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            boolean includeDeleted
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Tìm kiếm theo title (case-insensitive)
            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get(BlogPostEntity_.title)), likePattern));
            }

            // 2. Lọc theo tag – join Many-to-Many
            if (tagId != null) {
                var tagJoin = root.join(BlogPostEntity_.tags);
                predicates.add(cb.equal(tagJoin.get(BlogTagEntity_.id), tagId));
                // distinct để tránh kết quả nhân đôi khi join nhiều tag
                if (query != null) {
                    query.distinct(true);
                }
            }

            // 3. Lọc theo category – Many-to-One
            if (categoryId != null) {
                predicates.add(cb.equal(
                        root.get(BlogPostEntity_.category).get(BlogCategoryEntity_.id),
                        categoryId
                ));
            }

            // 4. Lọc theo loại bài
            if (type != null && !type.isBlank()) {
                PostType postType = PostType.fromCode(type);
                predicates.add(cb.equal(root.get(BlogPostEntity_.type), postType));
            }

            // 5. Lọc theo trạng thái
            if (status != null && !status.isBlank()) {
                PostStatus postStatus = PostStatus.fromCode(status);
                predicates.add(cb.equal(root.get(BlogPostEntity_.status), postStatus));
            }

            // 6. Mặc định chỉ lấy bài chưa xoá mềm
            if (!includeDeleted) {
                predicates.add(cb.isFalse(root.get(BlogPostEntity_.isDeleted)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
