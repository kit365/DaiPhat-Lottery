package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogPostApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogPostCoordinationPort;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostPublishQueuePort;
import com.daiphat.coreapi.application.port.out.blog.BlogViewCachePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import com.daiphat.coreapi.application.dto.request.blog.UpdateBlogPostRequest;
import org.springframework.context.ApplicationEventPublisher;
import com.daiphat.coreapi.application.event.BlogPostPublishedEvent;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[DP-168] Core BlogPostService Unit Tests")
class BlogPostServiceTest {

    private static final Long CATEGORY_ID = 10L;
    private static final Long TAG_ID_1 = 20L;
    private static final Long TAG_ID_2 = 21L;

    private static final String DEFAULT_TITLE = "Super Awesome Blog Post";
    private static final String DEFAULT_SLUG = "super-awesome-blog-post";
    private static final String DEFAULT_SUMMARY = "This is a summary of the blog post.";
    private static final String DEFAULT_CONTENT = "This is the full rich text content.";
    private static final String DEFAULT_THUMBNAIL = "https://cdn.daiphat.com/blogs/thumbnail.png";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String POST_TYPE_BLOG = "blog";

    private BlogPostServicePort blogPostService;
    private BlogPostCoordinationPort blogPostCoordinationPort;

    @Mock
    private BlogPostRepositoryPort blogPostRepositoryPort;

    @Mock
    private BlogCategoryServicePort blogCategoryServicePort;

    @Mock
    private BlogTagServicePort blogTagServicePort;

    @Mock
    private BlogPostApplicationMapper blogPostApplicationMapper;

    @Mock
    private StoragePort storagePort;

    @Mock
    private BlogViewCachePort blogViewCachePort;

    @Mock
    private BlogPostPublishQueuePort blogPostPublishQueuePort;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @BeforeEach
    void setUp() {
        BlogPostService impl = new BlogPostService(
                blogPostRepositoryPort,
                blogCategoryServicePort,
                blogTagServicePort,
                blogPostApplicationMapper,
                storagePort,
                blogViewCachePort,
                blogPostPublishQueuePort,
                eventPublisher
        );
        blogPostService = impl;
        blogPostCoordinationPort = impl;
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết thành công với đầy đủ thông tin hợp lệ")
    void createPost_success() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(DEFAULT_CONTENT)
                .thumbnail(DEFAULT_THUMBNAIL)
                .status(STATUS_PUBLISHED)
                .tagIds(Set.of(TAG_ID_1, TAG_ID_2))
                .build();

        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).name("Tech").build();
        BlogTagModel tag1 = BlogTagModel.builder().id(TAG_ID_1).name("Java").build();
        BlogTagModel tag2 = BlogTagModel.builder().id(TAG_ID_2).name("Spring Boot").build();
        Set<BlogTagModel> tags = Set.of(tag1, tag2);

        BlogPostModel postModel = BlogPostModel.builder()
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(DEFAULT_CONTENT)
                .thumbnail(DEFAULT_THUMBNAIL)
                .build();

        BlogPostModel savedModel = BlogPostModel.builder()
                .id(999L)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(DEFAULT_CONTENT)
                .thumbnail(DEFAULT_THUMBNAIL)
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .category(category)
                .tags(tags)
                .build();

        BlogPostResponse expectedResponse = BlogPostResponse.builder()
                .id(999L)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .thumbnail(DEFAULT_THUMBNAIL)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryServicePort.getCategoryModelById(CATEGORY_ID)).thenReturn(category);
        when(blogTagServicePort.getTagModelsByIds(Set.of(TAG_ID_1, TAG_ID_2))).thenReturn(tags);
        when(blogPostApplicationMapper.toModel(request)).thenReturn(postModel);
        when(blogPostRepositoryPort.save(postModel)).thenReturn(savedModel);
        when(blogPostApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        // WHEN
        BlogPostResponse response = blogPostService.createPost(request);

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(999L);
        assertThat(response.title()).isEqualTo(DEFAULT_TITLE);

        verify(eventPublisher).publishEvent(any(BlogPostPublishedEvent.class));

        verify(blogPostRepositoryPort).save(argThat(model ->
            DEFAULT_SLUG.equals(model.getSlug()) &&
            model.getCategory() == category &&
            model.getTags() == tags
        ));
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết thành công với nội dung content cực dài (500 lần lặp)")
    void createPost_success_withVeryLongContent() {
        // GIVEN
        StringBuilder contentBuilder = new StringBuilder();
        for (int i = 0; i < 500; i++) {
            contentBuilder.append("This is paragraph ").append(i).append(" of the very long blog post content. ");
        }
        String veryLongContent = contentBuilder.toString();

        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(veryLongContent)
                .thumbnail(DEFAULT_THUMBNAIL)
                .status(STATUS_PUBLISHED)
                .tagIds(Collections.emptySet())
                .build();

        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).name("Tech").build();

        BlogPostModel postModel = BlogPostModel.builder()
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(veryLongContent)
                .thumbnail(DEFAULT_THUMBNAIL)
                .build();

        BlogPostModel savedModel = BlogPostModel.builder()
                .id(1000L)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(veryLongContent)
                .thumbnail(DEFAULT_THUMBNAIL)
                .category(category)
                .tags(Collections.emptySet())
                .build();

        BlogPostResponse expectedResponse = BlogPostResponse.builder()
                .id(1000L)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .summary(DEFAULT_SUMMARY)
                .content(veryLongContent)
                .thumbnail(DEFAULT_THUMBNAIL)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryServicePort.getCategoryModelById(CATEGORY_ID)).thenReturn(category);
        when(blogPostApplicationMapper.toModel(request)).thenReturn(postModel);
        when(blogPostRepositoryPort.save(postModel)).thenReturn(savedModel);
        when(blogPostApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        // WHEN
        BlogPostResponse response = blogPostService.createPost(request);

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1000L);
        assertThat(response.content()).isEqualTo(veryLongContent);

        verify(blogPostRepositoryPort).save(argThat(model ->
                veryLongContent.equals(model.getContent())
        ));
    }

    @Test
    @DisplayName("[DP-302] CREATE: Slug tồn tại → tự động sinh slug duy nhất")
    void createPost_duplicateSlug_generatesUniqueSlug() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .slug(DEFAULT_SLUG)
                .build();

        // Khi slug gốc tồn tại → trả true
        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(true);
        // Slug có suffix không tồn tại → trả false để thoát vòng lặp
        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG + "-2")).thenReturn(false);

        BlogPostModel savedModel = BlogPostModel.builder()
                .id(1L)
                .slug(DEFAULT_SLUG + "-2")
                .build();
        when(blogPostRepositoryPort.save(any())).thenReturn(savedModel);

        // WHEN
        BlogPostResponse response = blogPostService.createPost(request);

        // THEN - slug mới được tạo tự động
        assertThat(response).isNotNull();
        verify(blogPostRepositoryPort).save(argThat(model ->
                (DEFAULT_SLUG + "-2").equals(model.getSlug())));
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết hẹn giờ thất bại khi thiếu scheduledAt")
    void createPost_scheduledWithoutScheduledAt_throwsScheduledAtRequired() {
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .status("scheduled")
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);

        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_SCHEDULED_AT_REQUIRED);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết hẹn giờ sẽ lưu publishedAt làm mốc xuất bản chính")
    void createPost_scheduled_setsPublishedAtAsSourceOfTruth() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1);
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .status("scheduled")
                .scheduledAt(futureTime)
                .build();

        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).name("Tech").build();
        BlogPostModel postModel = BlogPostModel.builder()
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .build();
        BlogPostModel savedModel = BlogPostModel.builder()
                .id(1001L)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED)
                .scheduledAt(futureTime)
                .publishedAt(futureTime)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryServicePort.getCategoryModelById(CATEGORY_ID)).thenReturn(category);
        when(blogPostApplicationMapper.toModel(request)).thenReturn(postModel);
        when(blogPostRepositoryPort.save(any(BlogPostModel.class))).thenReturn(savedModel);
        when(blogPostApplicationMapper.toResponse(savedModel)).thenReturn(BlogPostResponse.builder().id(1001L).build());

        blogPostService.createPost(request);

        verify(blogPostRepositoryPort).save(argThat(model ->
                model.getStatus() == com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED
                        && model.getScheduledAt() == null
                        && futureTime.equals(model.getPublishedAt())
        ));
        verify(blogPostPublishQueuePort).schedulePost(1001L, futureTime);
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết thất bại khi chọn trạng thái unpublished")
    void createPost_unpublished_throwsInvalidInput() {
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .title(DEFAULT_TITLE)
                .slug(DEFAULT_SLUG)
                .status("unpublished")
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);

        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-320] UPDATE: Cập nhật bài viết thất bại khi slug đã thuộc bài khác")
    void updatePost_duplicateSlug_throwsSlugExisted() {
        BlogPostModel existingPost = BlogPostModel.builder()
                .id(1L)
                .slug("old-slug")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.DRAFT)
                .build();
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder()
                .slug("duplicated-slug")
                .build();

        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(existingPost));
        when(blogPostRepositoryPort.existsBySlugAndIdNot("duplicated-slug", 1L)).thenReturn(true);

        assertThatThrownBy(() -> blogPostService.updatePost(1L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-320] UPDATE: Rời trạng thái scheduled sẽ xóa lịch đăng cũ")
    void updatePost_fromScheduledToPublished_clearsScheduledAt() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1);
        BlogPostModel existingPost = BlogPostModel.builder()
                .id(1L)
                .slug("old-slug")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED)
                .scheduledAt(futureTime)
                .build();
        BlogPostModel savedPost = BlogPostModel.builder()
                .id(1L)
                .slug("old-slug")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .scheduledAt(null)
                .build();
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder()
                .status("published")
                .build();

        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(existingPost));
        when(blogPostRepositoryPort.save(any(BlogPostModel.class))).thenReturn(savedPost);
        when(blogPostApplicationMapper.toResponse(savedPost)).thenReturn(BlogPostResponse.builder().id(1L).build());

        blogPostService.updatePost(1L, request);

        verify(blogPostRepositoryPort).save(argThat(post ->
                post.getStatus() == com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED
                        && post.getScheduledAt() == null
        ));
        verify(blogPostPublishQueuePort).cancelScheduledPost(1L);
        verify(eventPublisher).publishEvent(any(BlogPostPublishedEvent.class));
    }

    @Test
    @DisplayName("[DP-320] UPDATE: Không cho chuyển trực tiếp từ published sang scheduled")
    void updatePost_publishedToScheduled_throwsInvalidInput() {
        BlogPostModel existingPost = BlogPostModel.builder()
                .id(1L)
                .slug("published-post")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now().minusDays(1))
                .build();
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder()
                .status("scheduled")
                .scheduledAt(LocalDateTime.now().plusHours(2))
                .build();

        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(existingPost));

        assertThatThrownBy(() -> blogPostService.updatePost(1L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-320] UPDATE: Chuyển từ unpublished sang scheduled sẽ xóa publishedAt cũ")
    void updatePost_unpublishedToScheduled_clearsPublishedAt() {
        LocalDateTime oldPublishedAt = LocalDateTime.now().minusDays(5);
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1);
        BlogPostModel existingPost = BlogPostModel.builder()
                .id(1L)
                .slug("old-slug")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.UNPUBLISHED)
                .publishedAt(oldPublishedAt)
                .build();
        BlogPostModel savedPost = BlogPostModel.builder()
                .id(1L)
                .slug("old-slug")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED)
                .scheduledAt(futureTime)
                .publishedAt(null)
                .build();
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder()
                .status("scheduled")
                .scheduledAt(futureTime)
                .build();

        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(existingPost));
        when(blogPostRepositoryPort.save(any(BlogPostModel.class))).thenReturn(savedPost);
        when(blogPostApplicationMapper.toResponse(savedPost)).thenReturn(BlogPostResponse.builder().id(1L).build());

        blogPostService.updatePost(1L, request);

        verify(blogPostRepositoryPort).save(argThat(post ->
                post.getStatus() == com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED
                        && post.getScheduledAt() == null
                        && futureTime.equals(post.getPublishedAt())
        ));
    }

    @Test
    @DisplayName("[DP-322] SCHEDULER: Tự động publish các bài scheduled đã tới giờ (có merge dedup ID từ Redis và DB)")
    void publishDueScheduledPosts_success() {
        LocalDateTime now = LocalDateTime.now();
        when(blogPostPublishQueuePort.getDuePosts(any(LocalDateTime.class))).thenReturn(Set.of(1L, 2L));
        when(blogPostRepositoryPort.findDueScheduledPostIds(any(LocalDateTime.class))).thenReturn(List.of(2L, 3L));

        BlogPostModel post1 = BlogPostModel.builder().id(1L).status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED).build();
        BlogPostModel post2 = BlogPostModel.builder().id(2L).status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED).build();
        BlogPostModel post3 = BlogPostModel.builder().id(3L).status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED).build();

        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(post1));
        when(blogPostRepositoryPort.findById(2L)).thenReturn(Optional.of(post2));
        when(blogPostRepositoryPort.findById(3L)).thenReturn(Optional.of(post3));
        when(blogPostRepositoryPort.save(any(BlogPostModel.class))).thenAnswer(i -> i.getArgument(0));

        int publishedCount = blogPostService.publishDueScheduledPosts();

        assertThat(publishedCount).isEqualTo(3);
        verify(blogPostPublishQueuePort).removePosts(Set.of(1L, 2L, 3L));
        verify(eventPublisher, times(3)).publishEvent(any(BlogPostPublishedEvent.class));
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết thất bại - Danh mục không tồn tại")
    void createPost_categoryNotFound_throwsCategoryNotFound() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .status(STATUS_PUBLISHED)
                .slug(DEFAULT_SLUG)
                .status(STATUS_PUBLISHED)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryServicePort.getCategoryModelById(CATEGORY_ID))
                .thenThrow(new DomainException(ErrorCode.CATEGORY_NOT_FOUND));

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-302] CREATE: Tạo bài viết thất bại - Tag được truyền vào không tồn tại")
    void createPost_tagNotFound_throwsTagNotFound() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .type(POST_TYPE_BLOG)
                .status(STATUS_PUBLISHED)
                .slug(DEFAULT_SLUG)
                .status(STATUS_PUBLISHED)
                .tagIds(Set.of(TAG_ID_1, TAG_ID_2))
                .build();

        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).build();
        BlogTagModel tag1 = BlogTagModel.builder().id(TAG_ID_1).build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryServicePort.getCategoryModelById(CATEGORY_ID)).thenReturn(category);
        // Chỉ tìm thấy 1 trong 2 tag
        when(blogTagServicePort.getTagModelsByIds(Set.of(TAG_ID_1, TAG_ID_2))).thenReturn(Set.of(tag1));

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-305, DP-311] LIST: Lấy danh sách bài viết thành công với đầy đủ tham số bộ lọc")
    void getPosts_success_withFilters() {
        // GIVEN
        int page = 1;
        int limit = 10;
        String search = "Tech";
        List<Long> tagId = List.of(1L);
        List<Long> categoryId = List.of(2L);
        List<String> type = List.of("blog");
        String status = "PUBLISHED";
        String sortBy = "viewCount";
        String direction = "desc";
        boolean includeDeleted = false;

        BlogPostModel post = BlogPostModel.builder()
                .id(1L)
                .title("Tech News")
                .slug("tech-news")
                .viewCount(100)
                .build();
        List<BlogPostModel> posts = List.of(post);
        Page<BlogPostModel> postPage = new PageImpl<>(posts);

        BlogPostSummaryResponse summaryResponse = BlogPostSummaryResponse.builder()
                .id(1L)
                .title("Tech News")
                .slug("tech-news")
                .viewCount(100)
                .build();

        when(blogPostRepositoryPort.findAll(
                any(Pageable.class), eq(search), eq(tagId), eq(categoryId), eq(type), eq(status), eq(includeDeleted)
        )).thenReturn(postPage);

        when(blogPostApplicationMapper.toSummaryResponse(post)).thenReturn(summaryResponse);

        // WHEN
        PageResponse<BlogPostSummaryResponse> response = blogPostService.getPosts(
                page, limit, search, tagId, categoryId, type, status, sortBy, direction, includeDeleted
        );

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
        assertThat(response.getRecordList().getFirst().title()).isEqualTo("Tech News");
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(1);
        assertThat(response.getPagination().getCurrentPage()).isEqualTo(page);
    }

    @Test
    @DisplayName("[DP-305, DP-311] LIST: Lấy danh sách bài viết thành công khi sortBy rỗng - Fallback về sort mặc định")
    void getPosts_success_withDefaultFilters() {
        // GIVEN
        int page = 1;
        int limit = 10;

        BlogPostModel post = BlogPostModel.builder().id(2L).title("General News").build();
        Page<BlogPostModel> postPage = new PageImpl<>(List.of(post));
        BlogPostSummaryResponse summaryResponse = BlogPostSummaryResponse.builder().id(2L).title("General News").build();

        when(blogPostRepositoryPort.findAll(
                any(Pageable.class), eq(null), eq(null), eq(null), eq(null), eq(null), eq(false)
        )).thenReturn(postPage);

        when(blogPostApplicationMapper.toSummaryResponse(post)).thenReturn(summaryResponse);

        // WHEN
        PageResponse<BlogPostSummaryResponse> response = blogPostService.getPosts(
                page, limit, null, null, null, null, null, null, null, false
        );

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).hasSize(1);
        verify(blogPostRepositoryPort).findAll(
                argThat(pageable -> pageable.getSort().getOrderFor("createdAt") != null),
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(false)
        );
    }

    @Test
    @DisplayName("[DP-305, DP-311] LIST: Lấy danh sách bài viết thành công khi không có dữ liệu khớp bộ lọc - Trả về danh sách rỗng")
    void getPosts_success_emptyList() {
        // GIVEN
        int page = 1;
        int limit = 10;
        String search = "NonExistentKeyword";

        Page<BlogPostModel> emptyPage = new PageImpl<>(Collections.emptyList());

        when(blogPostRepositoryPort.findAll(
                any(Pageable.class), eq(search), eq(null), eq(null), eq(null), eq(null), eq(false)
        )).thenReturn(emptyPage);

        // WHEN
        PageResponse<BlogPostSummaryResponse> response = blogPostService.getPosts(
                page, limit, search, null, null, null, null, null, null, false
        );

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.getRecordList()).isEmpty();
        assertThat(response.getPagination().getTotalRecords()).isZero();

        verify(blogPostRepositoryPort).findAll(
                any(Pageable.class), eq(search), eq(null), eq(null), eq(null), eq(null), eq(false)
        );
        verify(blogPostApplicationMapper, never()).toSummaryResponse(any());
    }

    @Test
    @DisplayName("[DP-314] DETAIL: Lấy chi tiết bài viết thành công")
    void getPostById_success() {
        // GIVEN
        Long postId = 1121L;
        BlogPostModel post = BlogPostModel.builder()
                .id(postId)
                .title("Đại Phát ngày mới")
                .slug("dai-phat-ngay-moi")
                .summary("Bài viết chi tiết")
                .content("<p>Nội dung chi tiết</p>")
                .thumbnail(DEFAULT_THUMBNAIL)
                .viewCount(18)
                .build();

        BlogPostResponse expectedResponse = BlogPostResponse.builder()
                .id(postId)
                .title("Đại Phát ngày mới")
                .slug("dai-phat-ngay-moi")
                .summary("Bài viết chi tiết")
                .content("<p>Nội dung chi tiết</p>")
                .thumbnail(DEFAULT_THUMBNAIL)
                .viewCount(18)
                .build();

        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.of(post));
        when(blogPostApplicationMapper.toResponse(post)).thenReturn(expectedResponse);

        // WHEN
        BlogPostResponse response = blogPostService.getPostById(postId);

        // THEN
        assertThat(response).isNotNull();
        assertThat(response).isEqualTo(expectedResponse);

        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostApplicationMapper).toResponse(post);
        verifyNoMoreInteractions(blogPostRepositoryPort, blogPostApplicationMapper);
    }

    @Test
    @DisplayName("[DP-317] PUBLIC DETAIL: Lấy chi tiết bài viết công khai theo slug thành công")
    void getPublicPostBySlug_success() {
        BlogPostModel post = BlogPostModel.builder()
                .id(1121L)
                .title("Bài viết công khai")
                .slug("bai-viet-cong-khai")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .build();
        BlogPostResponse expectedResponse = BlogPostResponse.builder()
                .id(1121L)
                .title("Bài viết công khai")
                .slug("bai-viet-cong-khai")
                .status("published")
                .build();

        when(blogPostRepositoryPort.findPublishedBySlug("bai-viet-cong-khai")).thenReturn(Optional.of(post));
        when(blogPostApplicationMapper.toResponse(post)).thenReturn(expectedResponse);

        BlogPostResponse response = blogPostService.getPublicPostBySlug("bai-viet-cong-khai");

        assertThat(response).isEqualTo(expectedResponse);
        verify(blogPostRepositoryPort).findPublishedBySlug("bai-viet-cong-khai");
    }

    @Test
    @DisplayName("[DP-317] PUBLIC DETAIL: Lấy chi tiết bài viết công khai theo slug thất bại khi không tồn tại")
    void getPublicPostBySlug_notFound_throwsBlogNotFound() {
        when(blogPostRepositoryPort.findPublishedBySlug("missing-post")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogPostService.getPublicPostBySlug("missing-post"))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-317] PUBLIC DETAIL: Lấy bài viết liên quan cùng danh mục và loại trừ bài hiện tại")
    void getRelatedPublicPosts_success() {
        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).name("Tin tức").build();
        BlogPostModel currentPost = BlogPostModel.builder()
                .id(1121L)
                .slug("bai-viet-hien-tai")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .category(category)
                .build();
        BlogPostModel relatedPost = BlogPostModel.builder()
                .id(1122L)
                .title("Bài viết liên quan")
                .slug("bai-viet-lien-quan")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .category(category)
                .build();
        BlogPostSummaryResponse expectedSummary = BlogPostSummaryResponse.builder()
                .id(1122L)
                .title("Bài viết liên quan")
                .slug("bai-viet-lien-quan")
                .build();

        when(blogPostRepositoryPort.findPublishedBySlug("bai-viet-hien-tai")).thenReturn(Optional.of(currentPost));
        when(blogPostRepositoryPort.findRelatedPublishedPosts(eq(CATEGORY_ID), eq(1121L), any(Pageable.class)))
                .thenReturn(List.of(relatedPost));
        when(blogPostApplicationMapper.toSummaryResponse(relatedPost)).thenReturn(expectedSummary);

        List<BlogPostSummaryResponse> response = blogPostService.getRelatedPublicPosts("bai-viet-hien-tai", 4);

        assertThat(response).containsExactly(expectedSummary);
        verify(blogPostRepositoryPort).findRelatedPublishedPosts(
                eq(CATEGORY_ID),
                eq(1121L),
                argThat(pageable -> pageable.getPageSize() == 4)
        );
    }

    @Test
    @DisplayName("[DP-317] PUBLIC DETAIL: Lấy bài viết liên quan trả về rỗng khi bài hiện tại không có danh mục")
    void getRelatedPublicPosts_withoutCategory_returnsEmptyList() {
        BlogPostModel currentPost = BlogPostModel.builder()
                .id(1121L)
                .slug("bai-viet-khong-danh-muc")
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.PUBLISHED)
                .category(null)
                .build();

        when(blogPostRepositoryPort.findPublishedBySlug("bai-viet-khong-danh-muc")).thenReturn(Optional.of(currentPost));

        List<BlogPostSummaryResponse> response = blogPostService.getRelatedPublicPosts("bai-viet-khong-danh-muc", 4);

        assertThat(response).isEmpty();
        verify(blogPostRepositoryPort, never()).findRelatedPublishedPosts(anyLong(), anyLong(), any(Pageable.class));
    }

    @Test
    @DisplayName("[DP-314] DETAIL: Lấy chi tiết bài viết thất bại - Không tìm thấy bài viết")
    void getPostById_notFound_throwsBlogNotFound() {
        // GIVEN
        Long postId = 9999L;
        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.empty());

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.getPostById(postId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_NOT_FOUND);

        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostApplicationMapper, never()).toResponse(any());
    }

    @Test
    @DisplayName("[DP-317] VIEW COUNT: Tăng lượt xem thành công khi bài viết tồn tại và chưa có trong cache")
    void incrementViewCount_success_notInCache() {
        // GIVEN
        Long postId = 100L;

        when(blogViewCachePort.hasViewCount(postId)).thenReturn(false);
        when(blogPostRepositoryPort.existsById(postId)).thenReturn(true);

        // WHEN
        blogPostService.incrementViewCount(postId);

        // THEN
        verify(blogViewCachePort).hasViewCount(postId);
        verify(blogPostRepositoryPort).existsById(postId);
        verify(blogViewCachePort).incrementViewCount(postId);
    }

    @Test
    @DisplayName("[DP-317] VIEW COUNT: Tăng lượt xem thành công và bỏ qua truy vấn DB khi đã có sẵn trong cache")
    void incrementViewCount_success_alreadyInCache() {
        // GIVEN
        Long postId = 100L;

        when(blogViewCachePort.hasViewCount(postId)).thenReturn(true);

        // WHEN
        blogPostService.incrementViewCount(postId);

        // THEN
        verify(blogViewCachePort).hasViewCount(postId);
        verify(blogPostRepositoryPort, never()).existsById(anyLong());
        verify(blogViewCachePort).incrementViewCount(postId);
    }

    @Test
    @DisplayName("[DP-317] VIEW COUNT: Tăng lượt xem thất bại - Bài viết không tồn tại ném lỗi BLOG_NOT_FOUND")
    void incrementViewCount_notFound_throwsBlogNotFound() {
        // GIVEN
        Long postId = 100L;

        when(blogViewCachePort.hasViewCount(postId)).thenReturn(false);
        when(blogPostRepositoryPort.existsById(postId)).thenReturn(false);

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.incrementViewCount(postId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_NOT_FOUND);

        verify(blogViewCachePort).hasViewCount(postId);
        verify(blogPostRepositoryPort).existsById(postId);
        verify(blogViewCachePort, never()).incrementViewCount(anyLong());
    }

    @Test
    @DisplayName("[DP-308] DELETE: Xóa mềm bài viết thành công")
    void deletePost_success() {
        // GIVEN
        Long postId = 100L;
        BlogPostModel post = BlogPostModel.builder().id(postId).isDeleted(false).build();

        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.of(post));

        // WHEN
        blogPostService.deletePost(postId);

        // THEN
        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort).save(argThat(model -> model.isDeleted() == true));
    }

    @Test
    @DisplayName("[DP-308] DELETE: Xóa bài viết thất bại - Không tìm thấy bài viết")
    void deletePost_notFound_throwsBlogNotFound() {
        // GIVEN
        Long postId = 100L;
        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.empty());

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.deletePost(postId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_NOT_FOUND);

        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-308] DELETE: Xóa bài viết đã bị xóa trước đó - idempotent")
    void deletePost_alreadyDeleted_idempotent() {
        // GIVEN
        Long postId = 100L;
        BlogPostModel post = BlogPostModel.builder().id(postId).isDeleted(true).build();
        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.of(post));

        // WHEN
        blogPostService.deletePost(postId);

        // THEN
        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort).save(argThat(model -> model.isDeleted() == true));
    }

    @Test
    @DisplayName("CLEAR CATEGORY: Gỡ liên kết danh mục cho bài viết thành công")
    void clearCategoryForPosts_success() {
        // GIVEN
        List<Long> categoryIds = List.of(1L, 2L);

        // WHEN
        blogPostCoordinationPort.clearCategoryForPosts(categoryIds);

        // THEN
        verify(blogPostRepositoryPort).clearCategoryForPosts(categoryIds);
    }

    @Test
    @DisplayName("CLEAR CATEGORY: Danh sách rỗng hoặc null - no-op")
    void clearCategoryForPosts_emptyOrNull_noOp() {
        // WHEN
        blogPostCoordinationPort.clearCategoryForPosts(List.of());
        blogPostCoordinationPort.clearCategoryForPosts(null);

        // THEN
        verify(blogPostRepositoryPort, never()).clearCategoryForPosts(any());
    }

    @Test
    @DisplayName("CLEAR CATEGORY: Hoạt động idempotent khi ngắt liên kết")
    void clearCategoryForPosts_idempotent() {
        // GIVEN
        List<Long> categoryIds = List.of(1L);

        // WHEN
        blogPostCoordinationPort.clearCategoryForPosts(categoryIds);

        // THEN
        verify(blogPostRepositoryPort).clearCategoryForPosts(categoryIds);
    }

    @Test
    @DisplayName("COUNT PUBLISHED POSTS: Đếm số bài viết công khai thành công")
    void countPublishedPostsByCategoryId_success() {
        // GIVEN
        Long categoryId = 1L;
        when(blogPostRepositoryPort.countPublishedPostsByCategoryId(categoryId)).thenReturn(15L);

        // WHEN
        long result = blogPostCoordinationPort.countPublishedPostsByCategoryId(categoryId);

        // THEN
        assertThat(result).isEqualTo(15L);
        verify(blogPostRepositoryPort).countPublishedPostsByCategoryId(categoryId);
    }

    @Test
    @DisplayName("[DP-308] DELETE: Xóa mềm bài viết hẹn giờ thành công và hủy lịch")
    void deletePost_scheduled_success() {
        // GIVEN
        Long postId = 100L;
        BlogPostModel post = BlogPostModel.builder()
                .id(postId)
                .isDeleted(false)
                .status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.SCHEDULED)
                .build();

        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.of(post));

        // WHEN
        blogPostService.deletePost(postId);

        // THEN
        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort).save(argThat(model -> model.isDeleted() == true));
        verify(blogPostPublishQueuePort).cancelScheduledPost(postId);
    }

    @Test
    void getBlogStatuses_success() {
        List<com.daiphat.coreapi.application.dto.response.blog.BlogPostStatusResponse> result = blogPostService.getBlogStatuses();
        assertThat(result).isNotEmpty();
    }

    @Test
    void getBlogTypes_success() {
        List<com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse> result = blogPostService.getBlogTypes();
        assertThat(result).isNotEmpty();
    }

    @Test
    void uploadImage_success() {
        com.daiphat.coreapi.application.dto.storage.UploadRequest request = new com.daiphat.coreapi.application.dto.storage.UploadRequest(
                new byte[]{1, 2, 3}, "test.png", "image/png", null
        );
        com.daiphat.coreapi.application.dto.storage.StorageResult result = new com.daiphat.coreapi.application.dto.storage.StorageResult("id1", "http://image.url");
        when(storagePort.upload(any())).thenReturn(result);

        com.daiphat.coreapi.application.dto.storage.StorageResult actual = blogPostService.uploadImage(request, "blog_category");
        assertThat(actual.url()).isEqualTo("http://image.url");
    }

    @Test
    void removeTagFromPosts_success() {
        blogPostCoordinationPort.removeTagFromPosts(1L);
        verify(blogPostRepositoryPort).removeTagFromPosts(1L);
    }

    @Test
    void getPublicPosts_success() {
        org.springframework.data.domain.Page<BlogPostModel> pageMock = new org.springframework.data.domain.PageImpl<>(List.of());
        when(blogPostRepositoryPort.findAll(any(org.springframework.data.domain.Pageable.class), any(), any(), any(), any(), any(), eq(false))).thenReturn(pageMock);

        PageResponse<com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse> result =
            blogPostService.getPublicPosts(1, 10, "search", 1L, "title", "ASC");

        assertThat(result).isNotNull();
    }

    @Test
    void updatePost_slugExisted_throwsSlugExisted() {
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder().slug("new-slug").build();
        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(BlogPostModel.builder().build()));
        when(blogPostRepositoryPort.existsBySlugAndIdNot("new-slug", 1L)).thenReturn(true);

        assertThatThrownBy(() -> blogPostService.updatePost(1L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);
    }

    @Test
    void updatePost_transitionNotAllowed_throwsException() {
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder().status("UNPUBLISHED").build();
        BlogPostModel postDraft = BlogPostModel.builder().id(2L).status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.DRAFT).build();
        when(blogPostRepositoryPort.findById(2L)).thenReturn(Optional.of(postDraft));

        assertThatThrownBy(() -> blogPostService.updatePost(2L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void updatePost_tagsNotFound_throwsException() {
        UpdateBlogPostRequest request = UpdateBlogPostRequest.builder().tagIds(java.util.Set.of(1L, 2L)).build();
        BlogPostModel post = BlogPostModel.builder().id(1L).status(com.daiphat.coreapi.domain.model.enums.blog.PostStatus.DRAFT).build();
        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.of(post));
        when(blogTagServicePort.getTagModelsByIds(any())).thenReturn(java.util.Set.of());

        assertThatThrownBy(() -> blogPostService.updatePost(1L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }

    @Test
    void getPosts_invalidSortBy_usesDefault() {
        org.springframework.data.domain.Page<BlogPostModel> pageMock = new org.springframework.data.domain.PageImpl<>(List.of());
        when(blogPostRepositoryPort.findAll(any(), any(), any(), any(), any(), any(), anyBoolean())).thenReturn(pageMock);

        blogPostService.getPosts(1, 10, null, null, null, null, null, "invalid-sort", "DESC", false);

        verify(blogPostRepositoryPort).findAll(argThat(pageable ->
            pageable.getSort().iterator().next().getProperty().equals(com.daiphat.coreapi.shared.util.SearchConstants.DEFAULT_SORT_BY)
        ), any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void publishDueScheduledPosts_postNotFound_ignores() {
        when(blogPostPublishQueuePort.getDuePosts(any())).thenReturn(java.util.Set.of(1L));
        when(blogPostRepositoryPort.findDueScheduledPostIds(any())).thenReturn(List.of());
        when(blogPostRepositoryPort.findById(1L)).thenReturn(Optional.empty());

        int count = blogPostService.publishDueScheduledPosts();
        assertThat(count).isEqualTo(0);
        verify(blogPostPublishQueuePort).removePosts(java.util.Set.of(1L));
    }
}
