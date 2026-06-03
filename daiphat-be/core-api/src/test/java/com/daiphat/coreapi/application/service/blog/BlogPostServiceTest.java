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
import static org.mockito.ArgumentMatchers.any;
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
}
