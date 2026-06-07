package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogTagRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogTagResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogTagApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogPostCoordinationPort;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogTagRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-168] Core BlogTagService Unit Tests")
class BlogTagServiceTest {

    private static final Long TAG1_ID = 1L;
    private static final Long TAG2_ID = 2L;
    private static final String TAG1_NAME = "General Tag";
    private static final String TAG1_SLUG = "general-tag";
    private static final String TAG2_NAME = "Tech Tag";
    private static final String TAG2_SLUG = "tech-tag";

    private static final String NEW_TAG_NAME = "News Tag";
    private static final String NEW_TAG_SLUG = "news-tag";
    private static final String CUSTOM_TAG_SLUG = "custom-news";
    
    private static final String EXISTED_TAG_NAME = "Existed Name";
    private static final String DUMMY_TAG_NAME = "Name";
    private static final String DUMMY_TAG_SLUG = "slug";

    private static final String UPDATED_TAG_NAME = "Updated Tag Name";
    private static final String UPDATED_TAG_SLUG = "updated-slug";

    private BlogTagServicePort blogTagService;

    @Mock
    private BlogTagRepositoryPort blogTagRepositoryPort;

    @Mock
    private BlogTagApplicationMapper blogTagApplicationMapper;

    @Mock
    private BlogPostCoordinationPort blogPostCoordinationPort;

    private BlogTagModel mockTag1;
    private BlogTagModel mockTag2;
    private BlogTagResponse tagResponse1;

    @BeforeEach
    void setUp() {
        blogTagService = new BlogTagService(blogTagRepositoryPort, blogTagApplicationMapper, blogPostCoordinationPort);

        mockTag1 = BlogTagModel.builder()
                .id(TAG1_ID)
                .name(TAG1_NAME)
                .slug(TAG1_SLUG)
                .build();

        mockTag2 = BlogTagModel.builder()
                .id(TAG2_ID)
                .name(TAG2_NAME)
                .slug(TAG2_SLUG)
                .build();

        tagResponse1 = BlogTagResponse.builder()
                .id(TAG1_ID)
                .name(TAG1_NAME)
                .slug(TAG1_SLUG)
                .build();
    }

    @Test
    void getAllTags_success() {
        when(blogTagRepositoryPort.findAll()).thenReturn(Arrays.asList(mockTag1, mockTag2));
        when(blogTagApplicationMapper.toResponse(mockTag1)).thenReturn(tagResponse1);
        when(blogTagApplicationMapper.toResponse(mockTag2)).thenReturn(BlogTagResponse.builder()
                .id(TAG2_ID)
                .name(TAG2_NAME)
                .slug(TAG2_SLUG)
                .build());

        List<BlogTagResponse> result = blogTagService.getAllTags();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(TAG1_ID);
        assertThat(result.get(1).id()).isEqualTo(TAG2_ID);
    }

    @Test
    void getTags_success() {
        Page<BlogTagModel> pageMock = new PageImpl<>(List.of(mockTag1));
        when(blogTagRepositoryPort.findAll(any(Pageable.class), eq("General"))).thenReturn(pageMock);
        when(blogTagApplicationMapper.toResponse(mockTag1)).thenReturn(tagResponse1);

        PageResponse<BlogTagResponse> result = blogTagService.getTags(1, 10, "General");

        assertThat(result.getRecordList()).hasSize(1);
        assertThat(result.getRecordList().getFirst().id()).isEqualTo(TAG1_ID);
        assertThat(result.getPagination().getTotalRecords()).isEqualTo(1L);
    }

    @Test
    void getTagById_success() {
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));
        when(blogTagApplicationMapper.toResponse(mockTag1)).thenReturn(tagResponse1);

        BlogTagResponse result = blogTagService.getTagById(TAG1_ID);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(TAG1_ID);
        assertThat(result.name()).isEqualTo(TAG1_NAME);
    }

    @Test
    void getTagById_notFound_throwsTagNotFound() {
        when(blogTagRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogTagService.getTagById(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }

    @Test
    void createTag_withoutSlug_success() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(NEW_TAG_NAME, "");
        when(blogTagRepositoryPort.existsBySlug(NEW_TAG_SLUG)).thenReturn(false);
        when(blogTagRepositoryPort.existsByName(NEW_TAG_NAME)).thenReturn(false);

        BlogTagModel savedModel = BlogTagModel.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(NEW_TAG_SLUG)
                .build();

        BlogTagResponse expectedResponse = BlogTagResponse.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(NEW_TAG_SLUG)
                .build();

        when(blogTagRepositoryPort.save(any(BlogTagModel.class))).thenReturn(savedModel);
        when(blogTagApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogTagResponse result = blogTagService.createTag(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(3L);
        assertThat(result.slug()).isEqualTo(NEW_TAG_SLUG);
        verify(blogTagRepositoryPort).save(argThat(tag -> 
            NEW_TAG_NAME.equals(tag.getName()) &&
            NEW_TAG_SLUG.equals(tag.getSlug())
        ));
    }

    @Test
    void createTag_withNullSlug_success() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(NEW_TAG_NAME, null);
        when(blogTagRepositoryPort.existsBySlug(NEW_TAG_SLUG)).thenReturn(false);
        when(blogTagRepositoryPort.existsByName(NEW_TAG_NAME)).thenReturn(false);

        BlogTagModel savedModel = BlogTagModel.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(NEW_TAG_SLUG)
                .build();

        BlogTagResponse expectedResponse = BlogTagResponse.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(NEW_TAG_SLUG)
                .build();

        when(blogTagRepositoryPort.save(any(BlogTagModel.class))).thenReturn(savedModel);
        when(blogTagApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogTagResponse result = blogTagService.createTag(request);

        assertThat(result).isNotNull();
        assertThat(result.slug()).isEqualTo(NEW_TAG_SLUG);
    }

    @Test
    void createTag_withCustomSlug_success() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(NEW_TAG_NAME, CUSTOM_TAG_SLUG);
        when(blogTagRepositoryPort.existsBySlug(CUSTOM_TAG_SLUG)).thenReturn(false);
        when(blogTagRepositoryPort.existsByName(NEW_TAG_NAME)).thenReturn(false);

        BlogTagModel savedModel = BlogTagModel.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(CUSTOM_TAG_SLUG)
                .build();

        BlogTagResponse expectedResponse = BlogTagResponse.builder()
                .id(3L)
                .name(NEW_TAG_NAME)
                .slug(CUSTOM_TAG_SLUG)
                .build();

        when(blogTagRepositoryPort.save(any(BlogTagModel.class))).thenReturn(savedModel);
        when(blogTagApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogTagResponse result = blogTagService.createTag(request);

        assertThat(result).isNotNull();
        assertThat(result.slug()).isEqualTo(CUSTOM_TAG_SLUG);
    }

    @Test
    void createTag_slugExisted_throwsSlugExisted() {
        CreateBlogTagRequest request = new CreateBlogTagRequest("Title", "existed-slug");
        when(blogTagRepositoryPort.existsBySlug("existed-slug")).thenReturn(true);

        assertThatThrownBy(() -> blogTagService.createTag(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);
    }

    @Test
    void createTag_nameExisted_throwsTagNameExisted() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(EXISTED_TAG_NAME, DUMMY_TAG_SLUG);
        when(blogTagRepositoryPort.existsBySlug(DUMMY_TAG_SLUG)).thenReturn(false);
        when(blogTagRepositoryPort.existsByName(EXISTED_TAG_NAME)).thenReturn(true);

        assertThatThrownBy(() -> blogTagService.createTag(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NAME_EXISTED);
    }

    @Test
    void updateTag_success() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(UPDATED_TAG_NAME, UPDATED_TAG_SLUG);
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));
        when(blogTagRepositoryPort.existsBySlugAndIdNot(UPDATED_TAG_SLUG, TAG1_ID)).thenReturn(false);
        when(blogTagRepositoryPort.existsByNameAndIdNot(UPDATED_TAG_NAME, TAG1_ID)).thenReturn(false);

        BlogTagModel savedModel = BlogTagModel.builder()
                .id(TAG1_ID)
                .name(UPDATED_TAG_NAME)
                .slug(UPDATED_TAG_SLUG)
                .build();

        BlogTagResponse expectedResponse = BlogTagResponse.builder()
                .id(TAG1_ID)
                .name(UPDATED_TAG_NAME)
                .slug(UPDATED_TAG_SLUG)
                .build();

        when(blogTagRepositoryPort.save(any(BlogTagModel.class))).thenReturn(savedModel);
        when(blogTagApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogTagResponse result = blogTagService.updateTag(TAG1_ID, request);

        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo(UPDATED_TAG_NAME);
        verify(blogTagRepositoryPort).save(argThat(tag -> 
            UPDATED_TAG_NAME.equals(tag.getName()) &&
            UPDATED_TAG_SLUG.equals(tag.getSlug())
        ));
    }

    @Test
    void updateTag_withNullSlug_success() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(UPDATED_TAG_NAME, null);
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));
        
        String generatedSlug = "updated-tag-name"; // SlugUtils.toSlug("Updated Tag Name")
        when(blogTagRepositoryPort.existsBySlugAndIdNot(generatedSlug, TAG1_ID)).thenReturn(false);
        when(blogTagRepositoryPort.existsByNameAndIdNot(UPDATED_TAG_NAME, TAG1_ID)).thenReturn(false);

        BlogTagModel savedModel = BlogTagModel.builder()
                .id(TAG1_ID)
                .name(UPDATED_TAG_NAME)
                .slug(generatedSlug)
                .build();

        BlogTagResponse expectedResponse = BlogTagResponse.builder()
                .id(TAG1_ID)
                .name(UPDATED_TAG_NAME)
                .slug(generatedSlug)
                .build();

        when(blogTagRepositoryPort.save(any(BlogTagModel.class))).thenReturn(savedModel);
        when(blogTagApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogTagResponse result = blogTagService.updateTag(TAG1_ID, request);

        assertThat(result).isNotNull();
        assertThat(result.slug()).isEqualTo(generatedSlug);
    }

    @Test
    void updateTag_notFound_throwsTagNotFound() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(DUMMY_TAG_NAME, DUMMY_TAG_SLUG);
        when(blogTagRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogTagService.updateTag(99L, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }

    @Test
    void updateTag_slugExisted_throwsSlugExisted() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(DUMMY_TAG_NAME, DUMMY_TAG_SLUG);
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));
        when(blogTagRepositoryPort.existsBySlugAndIdNot(DUMMY_TAG_SLUG, TAG1_ID)).thenReturn(true);

        assertThatThrownBy(() -> blogTagService.updateTag(TAG1_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);
    }

    @Test
    void updateTag_nameExisted_throwsTagNameExisted() {
        CreateBlogTagRequest request = new CreateBlogTagRequest(EXISTED_TAG_NAME, DUMMY_TAG_SLUG);
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));
        when(blogTagRepositoryPort.existsBySlugAndIdNot(DUMMY_TAG_SLUG, TAG1_ID)).thenReturn(false);
        when(blogTagRepositoryPort.existsByNameAndIdNot(EXISTED_TAG_NAME, TAG1_ID)).thenReturn(true);

        assertThatThrownBy(() -> blogTagService.updateTag(TAG1_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NAME_EXISTED);
    }

    @Test
    void deleteTag_success() {
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));

        blogTagService.deleteTag(TAG1_ID);

        assertThat(mockTag1.isDeleted()).isTrue();
        verify(blogTagRepositoryPort).save(mockTag1);
        verify(blogPostCoordinationPort).removeTagFromPosts(TAG1_ID);
    }

    @Test
    void deleteTag_notFound_throwsTagNotFound() {
        when(blogTagRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogTagService.deleteTag(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TAG_NOT_FOUND);
    }

    @Test
    void deleteTag_alreadyDeleted_success() {
        mockTag1.setDeleted(true);
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));

        blogTagService.deleteTag(TAG1_ID);

        assertThat(mockTag1.isDeleted()).isTrue();
        verify(blogTagRepositoryPort).save(mockTag1);
        verify(blogPostCoordinationPort).removeTagFromPosts(TAG1_ID);
    }

    @Test
    void deleteTag_noPostsLinked_success() {
        when(blogTagRepositoryPort.findById(TAG1_ID)).thenReturn(Optional.of(mockTag1));

        blogTagService.deleteTag(TAG1_ID);

        assertThat(mockTag1.isDeleted()).isTrue();
        verify(blogTagRepositoryPort).save(mockTag1);
        verify(blogPostCoordinationPort).removeTagFromPosts(TAG1_ID);
    }

    @Test
    void getTagModelsByIds_success() {
        java.util.Set<Long> ids = java.util.Set.of(TAG1_ID, TAG2_ID);
        java.util.Set<BlogTagModel> models = java.util.Set.of(mockTag1, mockTag2);
        when(blogTagRepositoryPort.findAllByIds(ids)).thenReturn(models);

        java.util.Set<BlogTagModel> result = blogTagService.getTagModelsByIds(ids);

        assertThat(result).hasSize(2);
        assertThat(result).containsExactlyInAnyOrder(mockTag1, mockTag2);
    }
}
