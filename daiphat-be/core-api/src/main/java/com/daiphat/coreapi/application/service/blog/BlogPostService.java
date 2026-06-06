package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.request.blog.UpdateBlogPostRequest;
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
import com.daiphat.coreapi.application.port.in.blog.BlogPostCoordinationPort;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogViewCachePort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostPublishQueuePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import org.springframework.context.annotation.Lazy;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.shared.util.SearchConstants;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BlogPostService implements BlogPostServicePort, BlogPostCoordinationPort {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "viewCount",
            SearchConstants.DEFAULT_SORT_BY,
            "status",
            "publishedAt",
            "title",
            "updatedAt"
    );
    private static final Set<PostStatus> CREATABLE_STATUSES = Set.of(
            PostStatus.DRAFT,
            PostStatus.PUBLISHED,
            PostStatus.SCHEDULED
    );

    private final BlogPostRepositoryPort blogPostRepositoryPort;
    private final BlogCategoryServicePort blogCategoryServicePort;
    private final BlogTagServicePort blogTagServicePort;
    private final BlogPostApplicationMapper blogPostApplicationMapper;
    private final StoragePort storagePort;
    private final BlogViewCachePort blogViewCachePort;
    private final BlogPostPublishQueuePort blogPostPublishQueuePort;

    public BlogPostService(
            BlogPostRepositoryPort blogPostRepositoryPort,
            @Lazy BlogCategoryServicePort blogCategoryServicePort,
            @Lazy BlogTagServicePort blogTagServicePort,
            BlogPostApplicationMapper blogPostApplicationMapper,
            StoragePort storagePort,
            BlogViewCachePort blogViewCachePort,
            @Lazy BlogPostPublishQueuePort blogPostPublishQueuePort
    ) {
        this.blogPostRepositoryPort = blogPostRepositoryPort;
        this.blogCategoryServicePort = blogCategoryServicePort;
        this.blogTagServicePort = blogTagServicePort;
        this.blogPostApplicationMapper = blogPostApplicationMapper;
        this.storagePort = storagePort;
        this.blogViewCachePort = blogViewCachePort;
        this.blogPostPublishQueuePort = blogPostPublishQueuePort;
    }

    @Override
    @Transactional
    public BlogPostResponse createPost(CreateBlogPostRequest request) {
        if (blogPostRepositoryPort.existsBySlug(request.slug())) {
            throw new DomainException(ErrorCode.SLUG_EXISTED);
        }

        PostStatus targetStatus = PostStatus.fromCode(request.status());
        validateCreateStatus(targetStatus);
        LocalDateTime normalizedScheduledAt = normalizeScheduledAt(targetStatus, request.scheduledAt());

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
        postModel.setStatus(targetStatus);
        applyPublicationTiming(postModel, targetStatus, normalizedScheduledAt, null);
        
        // Khởi tạo giá trị mặc định (viewCount, status)
        postModel.initializeForCreate();

        BlogPostModel savedPost = blogPostRepositoryPort.save(postModel);

        if (savedPost.getStatus() == PostStatus.SCHEDULED) {
            blogPostPublishQueuePort.schedulePost(savedPost.getId(), savedPost.getPublishedAt());
        }

        return blogPostApplicationMapper.toResponse(savedPost);
    }

    @Override
    @Transactional(readOnly = true)
    public BlogPostResponse getPostById(Long id) {
        BlogPostModel post = blogPostRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.BLOG_NOT_FOUND));
        return blogPostApplicationMapper.toResponse(post);
    }

    @Override
    @Transactional
    public BlogPostResponse updatePost(Long id, UpdateBlogPostRequest request) {
        BlogPostModel post = blogPostRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.BLOG_NOT_FOUND));

        if (request.title()     != null) post.setTitle(request.title());
        if (request.slug() != null) {
            if (blogPostRepositoryPort.existsBySlugAndIdNot(request.slug(), id)) {
                throw new DomainException(ErrorCode.SLUG_EXISTED);
            }
            post.setSlug(request.slug());
        }
        if (request.summary() != null) post.setSummary(request.summary());
        if (request.content() != null) post.setContent(request.content());
        if (request.thumbnail() != null) post.setThumbnail(request.thumbnail());

        PostStatus currentStatus = post.getStatus();
        PostStatus nextStatus = currentStatus;
        if (request.type() != null) {
            PostType newType = PostType.fromCode(request.type());
            post.setType(newType);
        }

        if (request.status() != null) {
            PostStatus newStatus = PostStatus.fromCode(request.status());
            validateUpdateStatusTransition(currentStatus, newStatus);
            post.setStatus(newStatus);
            nextStatus = newStatus;
        }

        LocalDateTime scheduledAtCandidate = request.scheduledAt() != null
                ? request.scheduledAt()
                : resolveCurrentScheduleTime(post);
        LocalDateTime normalizedScheduledAt = normalizeScheduledAt(nextStatus, scheduledAtCandidate);
        applyPublicationTiming(post, nextStatus, normalizedScheduledAt, currentStatus);

        if (request.categoryId() != null) {
            BlogCategoryModel category = blogCategoryServicePort.getCategoryModelById(request.categoryId());
            post.setCategory(category);
        }

        if (request.tagIds() != null && !request.tagIds().isEmpty()) {
            Set<BlogTagModel> tags = blogTagServicePort.getTagModelsByIds(request.tagIds());
            if (tags.size() != request.tagIds().size()) {
                throw new DomainException(ErrorCode.TAG_NOT_FOUND);
            }
            post.setTags(tags);
        } else if (request.tagIds() != null) {
            post.setTags(Collections.emptySet());
        }

        BlogPostModel saved = blogPostRepositoryPort.save(post);

        if (saved.getStatus() == PostStatus.SCHEDULED) {
            blogPostPublishQueuePort.schedulePost(saved.getId(), saved.getPublishedAt());
        } else if (currentStatus == PostStatus.SCHEDULED) {
            blogPostPublishQueuePort.cancelScheduledPost(saved.getId());
        }

        return blogPostApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public int publishDueScheduledPosts() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Get due IDs from Redis and DB
        Set<Long> redisDueIds = blogPostPublishQueuePort.getDuePosts(now);
        List<Long> dbDueIds = blogPostRepositoryPort.findDueScheduledPostIds(now);

        // 2. Merge unique due IDs
        Set<Long> allDueIds = new java.util.HashSet<>(redisDueIds);
        allDueIds.addAll(dbDueIds);

        if (allDueIds.isEmpty()) {
            return 0;
        }

        int[] publishedCount = {0};

        // 3. Process each due post
        for (Long postId : allDueIds) {
            blogPostRepositoryPort.findById(postId).ifPresent(post -> {
                if (post.getStatus() == PostStatus.SCHEDULED && !post.isDeleted()) {
                    LocalDateTime publishAt = resolveCurrentScheduleTime(post);
                    post.setStatus(PostStatus.PUBLISHED);
                    post.setPublishedAt(publishAt != null ? publishAt : now);
                    post.setScheduledAt(null);
                    blogPostRepositoryPort.save(post);
                    publishedCount[0]++;
                }
            });
        }

        // 4. Clean up from Redis queue
        blogPostPublishQueuePort.removePosts(allDueIds);

        return publishedCount[0];
    }

    private void validateCreateStatus(PostStatus status) {
        if (!CREATABLE_STATUSES.contains(status)) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể tạo mới bài viết với trạng thái: " + status.getLabel()
            );
        }
    }

    private void validateUpdateStatusTransition(PostStatus currentStatus, PostStatus nextStatus) {
        if (currentStatus == nextStatus) {
            return;
        }

        boolean allowed = switch (currentStatus) {
            case DRAFT -> Set.of(PostStatus.PUBLISHED, PostStatus.SCHEDULED).contains(nextStatus);
            case SCHEDULED -> Set.of(PostStatus.PUBLISHED, PostStatus.DRAFT).contains(nextStatus);
            case PUBLISHED -> Set.of(PostStatus.UNPUBLISHED).contains(nextStatus);
            case UNPUBLISHED -> Set.of(PostStatus.PUBLISHED, PostStatus.SCHEDULED).contains(nextStatus);
        };

        if (!allowed) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể chuyển trạng thái bài viết từ " + currentStatus.getLabel()
                            + " sang " + nextStatus.getLabel() + "."
            );
        }
    }

    private void applyPublicationTiming(
            BlogPostModel post,
            PostStatus nextStatus,
            LocalDateTime normalizedScheduledAt,
            PostStatus currentStatus
    ) {
        if (nextStatus == PostStatus.SCHEDULED) {
            post.setScheduledAt(null);
            post.setPublishedAt(normalizedScheduledAt);
            return;
        }

        post.setScheduledAt(null);

        if (nextStatus == PostStatus.PUBLISHED) {
            if (currentStatus != PostStatus.PUBLISHED) {
                post.setPublishedAt(LocalDateTime.now());
            }
            return;
        }

        if (nextStatus == PostStatus.DRAFT) {
            post.setPublishedAt(null);
        }
    }

    private LocalDateTime resolveCurrentScheduleTime(BlogPostModel post) {
        if (post.getPublishedAt() != null) {
            return post.getPublishedAt();
        }
        return post.getScheduledAt();
    }

    private LocalDateTime normalizeScheduledAt(PostStatus status, LocalDateTime scheduledAt) {
        if (status != PostStatus.SCHEDULED) {
            return null;
        }
        if (scheduledAt == null) {
            throw new DomainException(ErrorCode.BLOG_SCHEDULED_AT_REQUIRED);
        }
        if (!scheduledAt.isAfter(LocalDateTime.now())) {
            throw new DomainException(ErrorCode.BLOG_SCHEDULED_AT_FUTURE);
        }
        return scheduledAt;
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
    public PageResponse<BlogPostSummaryResponse> getPublicPosts(
            int page,
            int limit,
            String search,
            Long categoryId,
            String sortBy,
            String direction
    ) {
        return getPosts(
                page,
                limit,
                search,
                null,
                categoryId,
                null,
                PostStatus.PUBLISHED.getCode(),
                sortBy,
                direction,
                false
        );
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
                .statusCounts(buildStatusCounts())
                .build();
    }

    private Map<String, Long> buildStatusCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, blogPostRepositoryPort.countAll());
        Arrays.stream(PostStatus.values())
                .forEach(status -> counts.put(status.getCode(), blogPostRepositoryPort.countByStatus(status.getCode())));
        return counts;
    }


    private String resolvePostSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return SearchConstants.DEFAULT_SORT_BY;
        }
        String normalizedSortBy = sortBy.trim();
        return ALLOWED_SORT_FIELDS.contains(normalizedSortBy)
                ? normalizedSortBy
                : SearchConstants.DEFAULT_SORT_BY;
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
        if (post.getStatus() == PostStatus.SCHEDULED) {
            blogPostPublishQueuePort.cancelScheduledPost(id);
        }
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
