package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogPostApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogTagRepositoryPort;
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

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Core BlogPostService - Create API Unit Tests")
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

    @Mock
    private BlogPostRepositoryPort blogPostRepositoryPort;

    @Mock
    private BlogCategoryRepositoryPort blogCategoryRepositoryPort;

    @Mock
    private BlogTagRepositoryPort blogTagRepositoryPort;

    @Mock
    private BlogPostApplicationMapper blogPostApplicationMapper;

    @Mock
    private StoragePort storagePort;

    @BeforeEach
    void setUp() {
        blogPostService = new BlogPostService(
                blogPostRepositoryPort,
                blogCategoryRepositoryPort,
                blogTagRepositoryPort,
                blogPostApplicationMapper,
                storagePort
        );
    }

    @Test
    @DisplayName("CREATE: Tạo bài viết thành công với đầy đủ thông tin hợp lệ")
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
        when(blogCategoryRepositoryPort.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
        when(blogTagRepositoryPort.findAllByIds(Set.of(TAG_ID_1, TAG_ID_2))).thenReturn(tags);
        when(blogPostApplicationMapper.toModel(request)).thenReturn(postModel);
        when(blogPostRepositoryPort.save(postModel)).thenReturn(savedModel);
        when(blogPostApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        // WHEN
        BlogPostResponse response = blogPostService.createPost(request);

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(999L);
        assertThat(response.title()).isEqualTo(DEFAULT_TITLE);
        
        verify(blogPostRepositoryPort).save(argThat(model -> 
            DEFAULT_SLUG.equals(model.getSlug()) &&
            model.getCategory() == category &&
            model.getTags() == tags
        ));
    }

    @Test
    @DisplayName("CREATE: Tạo bài viết thành công với nội dung content cực dài (500 lần lặp)")
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
        when(blogCategoryRepositoryPort.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
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
    @DisplayName("CREATE: Tạo bài viết thất bại - Slug đã tồn tại")
    void createPost_duplicateSlug_throwsSlugExisted() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .slug(DEFAULT_SLUG)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(true);

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("CREATE: Tạo bài viết thất bại - Danh mục không tồn tại")
    void createPost_categoryNotFound_throwsCategoryNotFound() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .slug(DEFAULT_SLUG)
                .build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findById(CATEGORY_ID)).thenReturn(Optional.empty());

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("CREATE: Tạo bài viết thất bại - Tag được truyền vào không tồn tại")
    void createPost_tagNotFound_throwsTagNotFound() {
        // GIVEN
        CreateBlogPostRequest request = CreateBlogPostRequest.builder()
                .categoryId(CATEGORY_ID)
                .slug(DEFAULT_SLUG)
                .tagIds(Set.of(TAG_ID_1, TAG_ID_2))
                .build();

        BlogCategoryModel category = BlogCategoryModel.builder().id(CATEGORY_ID).build();
        BlogTagModel tag1 = BlogTagModel.builder().id(TAG_ID_1).build();

        when(blogPostRepositoryPort.existsBySlug(DEFAULT_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findById(CATEGORY_ID)).thenReturn(Optional.of(category));
        // Chỉ tìm thấy 1 trong 2 tag
        when(blogTagRepositoryPort.findAllByIds(Set.of(TAG_ID_1, TAG_ID_2))).thenReturn(Set.of(tag1));

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.createPost(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);

        verify(blogPostRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("LIST: Lấy danh sách bài viết thành công với đầy đủ tham số bộ lọc")
    void getPosts_success_withFilters() {
        // GIVEN
        int page = 1;
        int limit = 10;
        String search = "Tech";
        Long tagId = 1L;
        Long categoryId = 2L;
        String type = "blog";
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
        assertThat(response.getRecordList().get(0).title()).isEqualTo("Tech News");
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(1);
        assertThat(response.getPagination().getCurrentPage()).isEqualTo(page);
    }

    @Test
    @DisplayName("LIST: Lấy danh sách bài viết thành công khi sortBy rỗng - Fallback về sort mặc định")
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
    @DisplayName("LIST: Lấy danh sách bài viết thành công khi không có dữ liệu khớp bộ lọc - Trả về danh sách rỗng")
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
    @DisplayName("VIEW COUNT: Tăng lượt xem thành công khi bài viết tồn tại")
    void incrementViewCount_success() {
        // GIVEN
        Long postId = 100L;
        BlogPostModel post = BlogPostModel.builder().id(postId).title("Hot Post").build();

        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.of(post));

        // WHEN
        blogPostService.incrementViewCount(postId);

        // THEN
        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort).incrementViewCount(postId);
    }

    @Test
    @DisplayName("VIEW COUNT: Tăng lượt xem thất bại - Bài viết không tồn tại ném lỗi BLOG_NOT_FOUND")
    void incrementViewCount_notFound_throwsBlogNotFound() {
        // GIVEN
        Long postId = 100L;

        when(blogPostRepositoryPort.findById(postId)).thenReturn(Optional.empty());

        // WHEN & THEN
        assertThatThrownBy(() -> blogPostService.incrementViewCount(postId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.BLOG_NOT_FOUND);

        verify(blogPostRepositoryPort).findById(postId);
        verify(blogPostRepositoryPort, never()).incrementViewCount(anyLong());
    }

    @Test
    @DisplayName("DELETE: Xóa mềm bài viết thành công")
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
    @DisplayName("DELETE: Xóa bài viết thất bại - Không tìm thấy bài viết")
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
    @DisplayName("DELETE: Xóa bài viết đã bị xóa trước đó - idempotent")
    void deletePost_alreadyDeleted_success() {
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
        blogPostService.clearCategoryForPosts(categoryIds);

        // THEN
        verify(blogPostRepositoryPort).clearCategoryForPosts(categoryIds);
    }

    @Test
    @DisplayName("CLEAR CATEGORY: Danh sách rỗng hoặc null - no-op")
    void clearCategoryForPosts_emptyOrNull_noOp() {
        // WHEN
        blogPostService.clearCategoryForPosts(List.of());
        blogPostService.clearCategoryForPosts(null);

        // THEN
        verify(blogPostRepositoryPort, never()).clearCategoryForPosts(any());
    }

    @Test
    @DisplayName("CLEAR CATEGORY: Hoạt động idempotent khi ngắt liên kết")
    void clearCategoryForPosts_idempotent() {
        // GIVEN
        List<Long> categoryIds = List.of(1L);

        // WHEN
        blogPostService.clearCategoryForPosts(categoryIds);

        // THEN
        verify(blogPostRepositoryPort).clearCategoryForPosts(categoryIds);
    }
}
