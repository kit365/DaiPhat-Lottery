package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostStatusResponse;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.mapper.blog.BlogPostApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogViewCachePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import org.springframework.context.annotation.Lazy;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
public class BlogPostService implements BlogPostServicePort {

    private final BlogPostRepositoryPort blogPostRepositoryPort;
    private final BlogCategoryServicePort blogCategoryServicePort;
    private final BlogTagServicePort blogTagServicePort;
    private final BlogPostApplicationMapper blogPostApplicationMapper;
    private final StoragePort storagePort;
    private final BlogViewCachePort blogViewCachePort;

    public BlogPostService(
            BlogPostRepositoryPort blogPostRepositoryPort,
            @Lazy BlogCategoryServicePort blogCategoryServicePort,
            @Lazy BlogTagServicePort blogTagServicePort,
            BlogPostApplicationMapper blogPostApplicationMapper,
            StoragePort storagePort,
            BlogViewCachePort blogViewCachePort
    ) {
        this.blogPostRepositoryPort = blogPostRepositoryPort;
        this.blogCategoryServicePort = blogCategoryServicePort;
        this.blogTagServicePort = blogTagServicePort;
        this.blogPostApplicationMapper = blogPostApplicationMapper;
        this.storagePort = storagePort;
        this.blogViewCachePort = blogViewCachePort;
    }

    @Override
    @Transactional
    public BlogPostResponse createPost(CreateBlogPostRequest request) {
        if (blogPostRepositoryPort.existsBySlug(request.slug())) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }

        BlogCategoryModel category = blogCategoryServicePort.getCategoryModelById(request.categoryId());
        
        Set<BlogTagModel> tags = Collections.emptySet();
        if (request.tagIds() != null && !request.tagIds().isEmpty()) {
            tags = blogTagServicePort.getTagModelsByIds(request.tagIds());
            if (tags.size() != request.tagIds().size()) {
                throw new DomainException(ErrorCode.TAG_NOT_FOUND);
            }
        }

        BlogPostModel postModel = blogPostApplicationMapper.toModel(request);
        postModel.setCategory(category);
        postModel.setTags(tags);
        
        // 5. Khởi tạo giá trị mặc định (viewCount, status)
        postModel.initializeForCreate();

        // 6. Lưu xuống DB qua Output Port
        BlogPostModel savedPost = blogPostRepositoryPort.save(postModel);

        // 7. Trả về response
        return blogPostApplicationMapper.toResponse(savedPost);
    }

    @Override
    public StorageResult uploadImage(UploadRequest request, String folder) {
        StorageUtils.validateImageUpload(request);

        String subFolder = StorageFolderConstants.BLOG_CONTENT_SUBFOLDER;
        if (StorageFolderConstants.BLOG_CATEGORY_SUBFOLDER.equalsIgnoreCase(folder)) {
            subFolder = StorageFolderConstants.BLOG_CATEGORY_SUBFOLDER;
        }
        String targetFolder = StorageFolderConstants.BLOG_ROOT_FOLDER + "/" + subFolder;

        UploadRequest blogsRequest = new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                targetFolder
        );

        return storagePort.upload(blogsRequest);
    }

    @Override
    public List<BlogPostTypeResponse> getBlogTypes() {
        return Arrays.stream(PostType.values())
                .map(type -> BlogPostTypeResponse.builder()
                        .code(type.getCode())
                        .name(type.getLabel())
                        .build())
                .toList();
    }

    @Override
    public List<BlogPostStatusResponse> getBlogStatuses() {
        return Arrays.stream(PostStatus.values())
                .map(status -> BlogPostStatusResponse.builder()
                        .code(status.getCode())
                        .name(status.getLabel())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BlogPostSummaryResponse> getPosts(
            int page,
            int limit,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            String sortBy,
            String direction,
            boolean includeDeleted
    ) {
        String resolvedSortBy = resolvePostSortField(sortBy);
        Sort sort = SortUtils.createSort(resolvedSortBy, direction);
        Pageable pageable = PageableUtils.of(page, limit, sort);

        Page<BlogPostModel> postPage = blogPostRepositoryPort.findAll(
                pageable, search, tagId, categoryId, type, status, includeDeleted
        );

        List<BlogPostSummaryResponse> records = postPage.getContent().stream()
                .map(blogPostApplicationMapper::toSummaryResponse)
                .toList();

        return PageResponse.<BlogPostSummaryResponse>builder()
                .recordList(records)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(postPage.getTotalElements())
                        .totalPages(postPage.getTotalPages())
                        .currentPage(page)
                        .limit(limit)
                        .isFirst(postPage.isFirst())
                        .isLast(postPage.isLast())
                        .build())
                .build();
    }

    /**
     * Kiểm tra và trả về tên cột sort hợp lệ cho bài viết.
     * Chỉ chấp nhận: viewCount, createdAt, status, publishedAt, title.
     */
    private String resolvePostSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "createdAt";
        }
        return switch (sortBy.trim()) {
            case "viewCount", "createdAt", "status", "publishedAt", "title", "updatedAt" -> sortBy.trim();
            default -> "createdAt";
        };
    }

    @Override
    public void incrementViewCount(Long id) {
        if (!blogViewCachePort.hasViewCount(id)) {
            if (!blogPostRepositoryPort.existsById(id)) {
                throw new DomainException(ErrorCode.BLOG_NOT_FOUND);
            }
        }
        blogViewCachePort.incrementViewCount(id);
    }

    @Override
    @Transactional
    public void deletePost(Long id) {
        BlogPostModel post = blogPostRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.BLOG_NOT_FOUND));
        post.setDeleted(true);
        blogPostRepositoryPort.save(post);
    }

    @Override
    @Transactional
    public void clearCategoryForPosts(List<Long> categoryIds) {
        if (categoryIds != null && !categoryIds.isEmpty()) {
            blogPostRepositoryPort.clearCategoryForPosts(categoryIds);
        }
    }

    @Override
    @Transactional
    public void removeTagFromPosts(Long tagId) {
        blogPostRepositoryPort.removeTagFromPosts(tagId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPublishedPostsByCategoryId(Long categoryId) {
        return blogPostRepositoryPort.countPublishedPostsByCategoryId(categoryId);
    }
}
