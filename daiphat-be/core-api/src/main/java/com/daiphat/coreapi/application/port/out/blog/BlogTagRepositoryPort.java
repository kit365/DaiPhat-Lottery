package com.daiphat.coreapi.application.port.out.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface BlogTagRepositoryPort {
    Optional<BlogTagModel> findById(Long id);
    Set<BlogTagModel> findAllByIds(Set<Long> ids);
    BlogTagModel save(BlogTagModel tag);
    List<BlogTagModel> findAll();
    void deleteById(Long id);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsBySlugAndIdNot(String slug, Long id);
    Page<BlogTagModel> findAll(Pageable pageable, String search);
}
