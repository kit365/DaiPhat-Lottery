package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryTreeResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryPublicResponse;
import com.daiphat.coreapi.application.dto.response.blog.CategoryStatusResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogCategoryApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogPostCoordinationPort;
import com.daiphat.coreapi.application.port.out.blog.BlogCategoryRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.domain.model.enums.blog.CategoryStatus;
import lombok.RequiredArgsConstructor;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.SlugUtils;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BlogCategoryService implements BlogCategoryServicePort {

    private final BlogCategoryRepositoryPort blogCategoryRepositoryPort;
    private final BlogCategoryApplicationMapper blogCategoryApplicationMapper;
    private final BlogPostCoordinationPort blogPostCoordinationPort;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BlogCategoryResponse> getCategories(int page, int limit, String search, boolean isTrash) {
        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byDisplayOrderAndCreatedAt());
        
        Page<BlogCategoryModel> resultPage = blogCategoryRepositoryPort.findAll(pageable, search, isTrash);
        
        List<BlogCategoryResponse> recordList = resultPage.getContent().stream()
                .map(blogCategoryApplicationMapper::toResponse)
                .toList();

        return PageResponse.<BlogCategoryResponse>builder()
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
    public List<BlogCategoryTreeResponse> getNestedCategories() {
        List<BlogCategoryModel> all = blogCategoryRepositoryPort.findAllByIsDeletedFalse();
        return all.stream()
                .filter(c -> c.getParent() == null)
                .map(c -> buildTree(c, all))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryStatusResponse> getStatuses() {
        return EnumOptionUtils.toCodeLabelResponses(CategoryStatus.values(), CategoryStatusResponse::new);
    }

    private BlogCategoryTreeResponse buildTree(BlogCategoryModel category, List<BlogCategoryModel> all) {
        List<BlogCategoryTreeResponse> children = all.stream()
                .filter(c -> c.getParent() != null && c.getParent().getId().equals(category.getId()))
                .map(c -> buildTree(c, all))
                .toList();
                
        return BlogCategoryTreeResponse.builder()
                .id(category.getId())
                .label(category.getName())
                .value(category.getId())
                .children(children)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BlogCategoryResponse getCategoryById(Long id) {
        BlogCategoryModel category = blogCategoryRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_NOT_FOUND));
        return blogCategoryApplicationMapper.toResponse(category);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogCategoryModel getCategoryModelById(Long id) {
        return blogCategoryRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_NOT_FOUND));
    }

    @Override
    @Transactional
    public BlogCategoryResponse createCategory(CreateBlogCategoryRequest request) {
        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(request.name());
        }

        if (blogCategoryRepositoryPort.existsBySlug(slug)) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }

        BlogCategoryModel parent = null;
        if (request.parentId() != null) {
            parent = blogCategoryRepositoryPort.findById(request.parentId())
                    .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_PARENT_NOT_FOUND));
        }

        Integer displayOrder = request.displayOrder();
        if (displayOrder == null) {
            if (request.parentId() != null) {
                displayOrder = blogCategoryRepositoryPort.findMaxDisplayOrderByParentId(request.parentId()) + 1;
            } else {
                displayOrder = blogCategoryRepositoryPort.findMaxDisplayOrderForRoot() + 1;
            }
        }

        BlogCategoryModel category = BlogCategoryModel.builder()
                .name(request.name())
                .slug(slug)
                .parent(parent)
                .description(request.description())
                .displayOrder(displayOrder)
                .isDeleted(false)
                .status(CategoryStatus.fromCode(request.status()))
                .avatar(request.avatar())
                .build();

        BlogCategoryModel saved = blogCategoryRepositoryPort.save(category);
        return blogCategoryApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public BlogCategoryResponse updateCategory(Long id, CreateBlogCategoryRequest request) {
        BlogCategoryModel category = blogCategoryRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_NOT_FOUND));

        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(request.name());
        }

        if (blogCategoryRepositoryPort.existsBySlugAndIdNot(slug, id)) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }

        BlogCategoryModel parent = null;
        if (request.parentId() != null) {
            if (request.parentId().equals(id)) {
                throw new DomainException(ErrorCode.CATEGORY_PARENT_INVALID);
            }
            parent = blogCategoryRepositoryPort.findById(request.parentId())
                    .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_PARENT_NOT_FOUND));
        }

        category.setName(request.name());
        category.setSlug(slug);
        category.setParent(parent);
        category.setDescription(request.description());
        category.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : category.getDisplayOrder());
        category.setStatus(CategoryStatus.fromCode(request.status()));
        category.setAvatar(request.avatar());

        BlogCategoryModel saved = blogCategoryRepositoryPort.save(category);
        return blogCategoryApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        BlogCategoryModel category = blogCategoryRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.CATEGORY_NOT_FOUND));
       List<Long> deletedCategoryIds = new ArrayList<>();
        softDeleteCategoryRecursively(category, deletedCategoryIds);
        blogPostCoordinationPort.clearCategoryForPosts(deletedCategoryIds);
    }

    private void softDeleteCategoryRecursively(BlogCategoryModel category, List<Long> deletedCategoryIds) {
        category.setDeleted(true);
        category.setStatus(CategoryStatus.INACTIVE);
        blogCategoryRepositoryPort.save(category);
        deletedCategoryIds.add(category.getId());
        
        List<BlogCategoryModel> children = blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(category.getId());
        for (BlogCategoryModel child : children) {
            softDeleteCategoryRecursively(child, deletedCategoryIds);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogCategoryPublicResponse> getPublicCategories() {
        List<BlogCategoryModel> all = blogCategoryRepositoryPort.findAllByIsDeletedFalse();
        return all.stream()
                .filter(c -> c.getStatus() == CategoryStatus.ACTIVE)
                .map(c -> BlogCategoryPublicResponse.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .slug(c.getSlug())
                        .avatar(c.getAvatar())
                        .postCount(blogPostCoordinationPort.countPublishedPostsByCategoryId(c.getId()))
                        .build())
                .toList();
    }
}
