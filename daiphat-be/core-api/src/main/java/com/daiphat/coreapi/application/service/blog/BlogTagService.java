package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogTagRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogTagResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogTagApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogTagRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.shared.util.SlugUtils;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BlogTagService implements BlogTagServicePort {

    private final BlogTagRepositoryPort blogTagRepositoryPort;
    private final BlogTagApplicationMapper blogTagApplicationMapper;
    private final BlogPostServicePort blogPostServicePort;

    @Override
    @Transactional(readOnly = true)
    public List<BlogTagResponse> getAllTags() {
        return blogTagRepositoryPort.findAll().stream()
                .map(blogTagApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BlogTagResponse> getTags(int page, int limit, String search) {
        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byCreatedAtDesc());
        Page<BlogTagModel> resultPage = blogTagRepositoryPort.findAll(pageable, search);

        List<BlogTagResponse> recordList = resultPage.getContent().stream()
                .map(blogTagApplicationMapper::toResponse)
                .toList();

        return PageResponse.<BlogTagResponse>builder()
                .recordList(recordList)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(resultPage.getTotalElements())
                        .totalPages(resultPage.getTotalPages())
                        .currentPage(page)
                        .limit(limit)
                        .isFirst(resultPage.isFirst())
                        .isLast(resultPage.isLast())
                        .build())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BlogTagResponse getTagById(Long id) {
        BlogTagModel tag = blogTagRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.TAG_NOT_FOUND));
        return blogTagApplicationMapper.toResponse(tag);
    }

    @Override
    @Transactional
    public BlogTagResponse createTag(CreateBlogTagRequest request) {
        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(request.name());
        }

        if (blogTagRepositoryPort.existsBySlug(slug)) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }
        
        if (blogTagRepositoryPort.existsByName(request.name())) {
            throw new DomainException(ErrorCode.TAG_NAME_EXISTED);
        }

        BlogTagModel tag = BlogTagModel.builder()
                .name(request.name())
                .slug(slug)
                .build();

        BlogTagModel saved = blogTagRepositoryPort.save(tag);
        return blogTagApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public BlogTagResponse updateTag(Long id, CreateBlogTagRequest request) {
        BlogTagModel tag = blogTagRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.TAG_NOT_FOUND));

        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(request.name());
        }

        if (blogTagRepositoryPort.existsBySlugAndIdNot(slug, id)) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }
        
        if (blogTagRepositoryPort.existsByNameAndIdNot(request.name(), id)) {
            throw new DomainException(ErrorCode.TAG_NAME_EXISTED);
        }

        tag.setName(request.name());
        tag.setSlug(slug);

        BlogTagModel saved = blogTagRepositoryPort.save(tag);
        return blogTagApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteTag(Long id) {
        BlogTagModel tag = blogTagRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.TAG_NOT_FOUND));
        tag.setDeleted(true);
        blogTagRepositoryPort.save(tag);
        blogPostServicePort.removeTagFromPosts(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<BlogTagModel> getTagModelsByIds(Set<Long> ids) {
        return blogTagRepositoryPort.findAllByIds(ids);
    }
}
