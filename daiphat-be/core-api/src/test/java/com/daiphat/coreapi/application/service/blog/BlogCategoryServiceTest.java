package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryTreeResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryPublicResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogCategoryApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import com.daiphat.coreapi.application.port.in.blog.BlogPostCoordinationPort;
import com.daiphat.coreapi.application.port.out.blog.BlogCategoryRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.domain.model.enums.blog.CategoryStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-168] Core BlogCategoryService Unit Tests")
class BlogCategoryServiceTest {

    private static final Long ROOT_ID = 1L;
    private static final Long CHILD_ID = 2L;
    private static final String ROOT_NAME = "Root Category";
    private static final String ROOT_SLUG = "root-category";
    private static final String ROOT_DESC = "Root Description";
    private static final String ROOT_AVATAR = "root-avatar.jpg";
    
    private static final String CHILD_NAME = "Child Category";
    private static final String CHILD_SLUG = "child-category";
    private static final String CHILD_DESC = "Child Description";

    private static final String NEW_CAT_NAME = "New Category";
    private static final String NEW_CAT_SLUG = "new-category";
    private static final String NEW_CAT_DESC = "New Description";
    private static final String NEW_CAT_AVATAR = "avatar.jpg";

    private static final String CUSTOM_CHILD_NAME = "Child Category Name";
    private static final String CUSTOM_CHILD_SLUG = "custom-child-slug";
    private static final String CUSTOM_CHILD_DESC = "Description";

    private static final String UPDATED_CAT_NAME = "Updated Root Name";
    private static final String UPDATED_CAT_SLUG = "updated-root-slug";
    private static final String UPDATED_CAT_DESC = "Updated Description";
    private static final String UPDATED_CAT_AVATAR = "new-avatar.jpg";

    private static final String DUMMY_SLUG = "slug";
    private static final String DUMMY_NAME = "Name";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private BlogCategoryServicePort blogCategoryService;

    @Mock
    private BlogCategoryRepositoryPort blogCategoryRepositoryPort;

    @Mock
    private BlogCategoryApplicationMapper blogCategoryApplicationMapper;

    @Mock
    private BlogPostCoordinationPort blogPostCoordinationPort;

    private BlogCategoryModel rootCategory;
    private BlogCategoryModel childCategory;
    private BlogCategoryResponse rootResponse;

    @BeforeEach
    void setUp() {
        blogCategoryService = new BlogCategoryService(blogCategoryRepositoryPort, blogCategoryApplicationMapper, blogPostCoordinationPort);

        rootCategory = BlogCategoryModel.builder()
                .id(ROOT_ID)
                .name(ROOT_NAME)
                .slug(ROOT_SLUG)
                .description(ROOT_DESC)
                .displayOrder(1)
                .isDeleted(false)
                .status(CategoryStatus.ACTIVE)
                .avatar(ROOT_AVATAR)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        childCategory = BlogCategoryModel.builder()
                .id(CHILD_ID)
                .parent(rootCategory)
                .name(CHILD_NAME)
                .slug(CHILD_SLUG)
                .description(CHILD_DESC)
                .displayOrder(1)
                .isDeleted(false)
                .status(CategoryStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        rootResponse = BlogCategoryResponse.builder()
                .id(ROOT_ID)
                .parentId(null)
                .parentName(null)
                .name(ROOT_NAME)
                .slug(ROOT_SLUG)
                .description(ROOT_DESC)
                .displayOrder(1)
                .isDeleted(false)
                .status(STATUS_ACTIVE)
                .avatar(ROOT_AVATAR)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getCategories_success() {
        Page<BlogCategoryModel> pageMock = new PageImpl<>(List.of(rootCategory));
        when(blogCategoryRepositoryPort.findAll(any(Pageable.class), eq("Root"), eq(false))).thenReturn(pageMock);
        when(blogCategoryApplicationMapper.toResponse(rootCategory)).thenReturn(rootResponse);

        PageResponse<BlogCategoryResponse> result = blogCategoryService.getCategories(1, 10, "Root", false);

        assertThat(result.getRecordList()).hasSize(1);
        assertThat(result.getRecordList().getFirst().id()).isEqualTo(ROOT_ID);
        assertThat(result.getPagination().getTotalRecords()).isEqualTo(1L);
    }

    @Test
    void getNestedCategories_success() {
        List<BlogCategoryModel> allCategories = Arrays.asList(rootCategory, childCategory);
        when(blogCategoryRepositoryPort.findAllByIsDeletedFalse()).thenReturn(allCategories);

        List<BlogCategoryTreeResponse> result = blogCategoryService.getNestedCategories();

        assertThat(result).hasSize(1);
        BlogCategoryTreeResponse rootNode = result.getFirst();
        assertThat(rootNode.id()).isEqualTo(ROOT_ID);
        assertThat(rootNode.children()).hasSize(1);
        assertThat(rootNode.children().getFirst().id()).isEqualTo(CHILD_ID);
    }

    @Test
    void getCategoryById_success() {
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryApplicationMapper.toResponse(rootCategory)).thenReturn(rootResponse);

        BlogCategoryResponse result = blogCategoryService.getCategoryById(ROOT_ID);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(ROOT_ID);
        assertThat(result.name()).isEqualTo(ROOT_NAME);
    }

    @Test
    void getCategoryById_notFound_throwsCategoryNotFound() {
        when(blogCategoryRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogCategoryService.getCategoryById(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);
    }

    @Test
    void getCategoryModelById_success() {
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        BlogCategoryModel result = blogCategoryService.getCategoryModelById(ROOT_ID);
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(ROOT_ID);
    }

    @Test
    void getCategoryModelById_notFound_throwsException() {
        when(blogCategoryRepositoryPort.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> blogCategoryService.getCategoryModelById(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);
    }

    @Test
    void getStatuses_success() {
        List<com.daiphat.coreapi.application.dto.response.blog.CategoryStatusResponse> result = blogCategoryService.getStatuses();
        assertThat(result).isNotEmpty();
        assertThat(result).extracting("code").contains("ACTIVE", "INACTIVE");
    }

    @Test
    void createCategory_withoutParentAndDisplayOrder_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(
                NEW_CAT_NAME,
                "",
                null,
                NEW_CAT_DESC,
                null,
                STATUS_ACTIVE,
                NEW_CAT_AVATAR
        );

        when(blogCategoryRepositoryPort.existsBySlug(NEW_CAT_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findMaxDisplayOrderForRoot()).thenReturn(5);

        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(3L)
                .name(NEW_CAT_NAME)
                .slug(NEW_CAT_SLUG)
                .displayOrder(6)
                .isDeleted(false)
                .status(CategoryStatus.ACTIVE)
                .avatar(NEW_CAT_AVATAR)
                .build();

        BlogCategoryResponse expectedResponse = BlogCategoryResponse.builder()
                .id(3L)
                .parentId(null)
                .parentName(null)
                .name(NEW_CAT_NAME)
                .slug(NEW_CAT_SLUG)
                .description(NEW_CAT_DESC)
                .displayOrder(6)
                .isDeleted(false)
                .status(STATUS_ACTIVE)
                .avatar(NEW_CAT_AVATAR)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogCategoryResponse result = blogCategoryService.createCategory(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(3L);
        assertThat(result.displayOrder()).isEqualTo(6);
        verify(blogCategoryRepositoryPort).save(argThat(category -> 
            NEW_CAT_SLUG.equals(category.getSlug()) &&
            category.getDisplayOrder() == 6 &&
            category.getParent() == null &&
            NEW_CAT_AVATAR.equals(category.getAvatar())
        ));
    }

    @Test
    void createCategory_withNullSlug_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(NEW_CAT_NAME, null, null, null, 1, STATUS_ACTIVE, null);
        when(blogCategoryRepositoryPort.existsBySlug(NEW_CAT_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(rootCategory);
        when(blogCategoryApplicationMapper.toResponse(any())).thenReturn(rootResponse);

        BlogCategoryResponse result = blogCategoryService.createCategory(request);
        assertThat(result).isNotNull();
        verify(blogCategoryRepositoryPort).save(argThat(category -> NEW_CAT_SLUG.equals(category.getSlug())));
    }

    @Test
    void createCategory_withParentAndNullDisplayOrder_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(
                CUSTOM_CHILD_NAME,
                CUSTOM_CHILD_SLUG,
                ROOT_ID,
                CUSTOM_CHILD_DESC,
                null,
                STATUS_ACTIVE,
                null
        );

        when(blogCategoryRepositoryPort.existsBySlug(CUSTOM_CHILD_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryRepositoryPort.findMaxDisplayOrderByParentId(ROOT_ID)).thenReturn(10);
        
        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(4L)
                .displayOrder(11)
                .build();
        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(rootResponse);

        blogCategoryService.createCategory(request);

        verify(blogCategoryRepositoryPort).save(argThat(category -> category.getDisplayOrder() == 11));
    }

    @Test
    void createCategory_withParentAndCustomSlug_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(
                CUSTOM_CHILD_NAME,
                CUSTOM_CHILD_SLUG,
                ROOT_ID,
                CUSTOM_CHILD_DESC,
                3,
                STATUS_ACTIVE,
                null
        );

        when(blogCategoryRepositoryPort.existsBySlug(CUSTOM_CHILD_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));

        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(4L)
                .parent(rootCategory)
                .name(CUSTOM_CHILD_NAME)
                .slug(CUSTOM_CHILD_SLUG)
                .displayOrder(3)
                .status(CategoryStatus.ACTIVE)
                .build();

        BlogCategoryResponse expectedResponse = BlogCategoryResponse.builder()
                .id(4L)
                .parentId(ROOT_ID)
                .parentName(ROOT_NAME)
                .name(CUSTOM_CHILD_NAME)
                .slug(CUSTOM_CHILD_SLUG)
                .description(CUSTOM_CHILD_DESC)
                .displayOrder(3)
                .isDeleted(false)
                .status(STATUS_ACTIVE)
                .avatar(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogCategoryResponse result = blogCategoryService.createCategory(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(4L);
        assertThat(result.parentId()).isEqualTo(ROOT_ID);
        verify(blogCategoryRepositoryPort).save(argThat(category -> 
            CUSTOM_CHILD_SLUG.equals(category.getSlug()) &&
            category.getParent() != null &&
            category.getParent().getId().equals(ROOT_ID) &&
            category.getDisplayOrder() == 3
        ));
    }

    @Test
    void createCategory_existingSlug_autoGeneratesUniqueSlug() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest("Existed Slug", "existed-slug", null, null, null, STATUS_ACTIVE, null);
        // Khi slug gốc tồn tại → trả true
        when(blogCategoryRepositoryPort.existsBySlug("existed-slug")).thenReturn(true);
        // Slug suffix không tồn tại → trả false
        when(blogCategoryRepositoryPort.existsBySlug("existed-slug-2")).thenReturn(false);

        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(1L)
                .name("Existed Slug")
                .slug("existed-slug-2")
                .build();
        when(blogCategoryRepositoryPort.save(any())).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(
                BlogCategoryResponse.builder().id(1L).name("Existed Slug").slug("existed-slug-2").build());

        BlogCategoryResponse result = blogCategoryService.createCategory(request);

        assertThat(result).isNotNull();
        assertThat(result.slug()).isEqualTo("existed-slug-2");
        verify(blogCategoryRepositoryPort).save(any());
    }

    @Test
    void createCategory_parentNotFound_throwsCategoryParentNotFound() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(DUMMY_NAME, DUMMY_SLUG, 99L, null, null, STATUS_ACTIVE, null);
        when(blogCategoryRepositoryPort.existsBySlug(DUMMY_SLUG)).thenReturn(false);
        when(blogCategoryRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogCategoryService.createCategory(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_PARENT_NOT_FOUND);
    }

    @Test
    void updateCategory_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(
                UPDATED_CAT_NAME,
                UPDATED_CAT_SLUG,
                null,
                UPDATED_CAT_DESC,
                2,
                STATUS_ACTIVE,
                UPDATED_CAT_AVATAR
        );

        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryRepositoryPort.existsBySlugAndIdNot(UPDATED_CAT_SLUG, ROOT_ID)).thenReturn(false);

        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(ROOT_ID)
                .name(UPDATED_CAT_NAME)
                .slug(UPDATED_CAT_SLUG)
                .description(UPDATED_CAT_DESC)
                .displayOrder(2)
                .status(CategoryStatus.ACTIVE)
                .avatar(UPDATED_CAT_AVATAR)
                .build();

        BlogCategoryResponse expectedResponse = BlogCategoryResponse.builder()
                .id(ROOT_ID)
                .parentId(null)
                .parentName(null)
                .name(UPDATED_CAT_NAME)
                .slug(UPDATED_CAT_SLUG)
                .description(UPDATED_CAT_DESC)
                .displayOrder(2)
                .isDeleted(false)
                .status(STATUS_ACTIVE)
                .avatar(UPDATED_CAT_AVATAR)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(expectedResponse);

        BlogCategoryResponse result = blogCategoryService.updateCategory(ROOT_ID, request);

        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo(UPDATED_CAT_NAME);
        assertThat(result.avatar()).isEqualTo(UPDATED_CAT_AVATAR);
        verify(blogCategoryRepositoryPort).save(argThat(category -> 
            UPDATED_CAT_NAME.equals(category.getName()) &&
            UPDATED_CAT_SLUG.equals(category.getSlug()) &&
            UPDATED_CAT_AVATAR.equals(category.getAvatar())
        ));
    }

    @Test
    void updateCategory_withNullSlugAndNullDisplayOrder_success() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(
                UPDATED_CAT_NAME,
                null,
                null,
                UPDATED_CAT_DESC,
                null,
                STATUS_ACTIVE,
                null
        );

        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        String generatedSlug = "updated-root-name"; // SlugUtils.toSlug(UPDATED_CAT_NAME)
        when(blogCategoryRepositoryPort.existsBySlugAndIdNot(generatedSlug, ROOT_ID)).thenReturn(false);

        BlogCategoryModel savedModel = BlogCategoryModel.builder()
                .id(ROOT_ID)
                .displayOrder(rootCategory.getDisplayOrder())
                .slug(generatedSlug)
                .build();

        when(blogCategoryRepositoryPort.save(any(BlogCategoryModel.class))).thenReturn(savedModel);
        when(blogCategoryApplicationMapper.toResponse(savedModel)).thenReturn(rootResponse);

        blogCategoryService.updateCategory(ROOT_ID, request);

        verify(blogCategoryRepositoryPort).save(argThat(category -> 
            generatedSlug.equals(category.getSlug()) &&
            category.getDisplayOrder() == rootCategory.getDisplayOrder()
        ));
    }

    @Test
    void updateCategory_parentIsSelf_throwsCategoryParentInvalid() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest(DUMMY_NAME, DUMMY_SLUG, ROOT_ID, null, null, STATUS_ACTIVE, null);
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryRepositoryPort.existsBySlugAndIdNot(DUMMY_SLUG, ROOT_ID)).thenReturn(false);

        assertThatThrownBy(() -> blogCategoryService.updateCategory(ROOT_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_PARENT_INVALID);
    }

    @Test
    void deleteCategory_success() {
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(ROOT_ID)).thenReturn(List.of());

        blogCategoryService.deleteCategory(ROOT_ID);

        assertThat(rootCategory.isDeleted()).isTrue();
        assertThat(rootCategory.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        verify(blogCategoryRepositoryPort).save(rootCategory);
        verify(blogCategoryRepositoryPort).findAllByParentIdAndIsDeletedFalse(ROOT_ID);
        verify(blogPostCoordinationPort).clearCategoryForPosts(List.of(ROOT_ID));
    }

    @Test
    void deleteCategory_withChildren_success_softDeletesRecursively() {
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        // Giả lập ROOT_ID có 1 child
        when(blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(ROOT_ID)).thenReturn(List.of(childCategory));
        // Giả lập child không có sub-child
        when(blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(CHILD_ID)).thenReturn(List.of());

        blogCategoryService.deleteCategory(ROOT_ID);

        assertThat(rootCategory.isDeleted()).isTrue();
        assertThat(rootCategory.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        assertThat(childCategory.isDeleted()).isTrue();
        assertThat(childCategory.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        
        verify(blogCategoryRepositoryPort).save(rootCategory);
        verify(blogCategoryRepositoryPort).save(childCategory);
        verify(blogPostCoordinationPort).clearCategoryForPosts(List.of(ROOT_ID, CHILD_ID));
    }

    @Test
    void deleteCategory_childOnly_success() {
        when(blogCategoryRepositoryPort.findById(CHILD_ID)).thenReturn(Optional.of(childCategory));
        when(blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(CHILD_ID)).thenReturn(List.of());

        blogCategoryService.deleteCategory(CHILD_ID);

        assertThat(childCategory.isDeleted()).isTrue();
        assertThat(childCategory.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        
        // Parent must remain active and not deleted
        assertThat(rootCategory.isDeleted()).isFalse();
        assertThat(rootCategory.getStatus()).isEqualTo(CategoryStatus.ACTIVE);

        verify(blogCategoryRepositoryPort).save(childCategory);
        verify(blogCategoryRepositoryPort, never()).save(rootCategory);
        verify(blogPostCoordinationPort).clearCategoryForPosts(List.of(CHILD_ID));
    }

    @Test
    void deleteCategory_notFound_throwsCategoryNotFound() {
        when(blogCategoryRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogCategoryService.deleteCategory(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);

        verify(blogPostCoordinationPort, never()).clearCategoryForPosts(any());
    }

    @Test
    void deleteCategory_alreadyDeleted_success() {
        rootCategory.setDeleted(true);
        rootCategory.setStatus(CategoryStatus.INACTIVE);
        when(blogCategoryRepositoryPort.findById(ROOT_ID)).thenReturn(Optional.of(rootCategory));
        when(blogCategoryRepositoryPort.findAllByParentIdAndIsDeletedFalse(ROOT_ID)).thenReturn(List.of());

        blogCategoryService.deleteCategory(ROOT_ID);

        assertThat(rootCategory.isDeleted()).isTrue();
        assertThat(rootCategory.getStatus()).isEqualTo(CategoryStatus.INACTIVE);
        verify(blogCategoryRepositoryPort).save(rootCategory);
        verify(blogPostCoordinationPort).clearCategoryForPosts(List.of(ROOT_ID));
    }

    @Test
    @DisplayName("getPublicCategories success")
    void getPublicCategories_success() {
        List<BlogCategoryModel> allCategories = List.of(rootCategory, childCategory);
        when(blogCategoryRepositoryPort.findAllByIsDeletedFalse()).thenReturn(allCategories);
        when(blogPostCoordinationPort.countPublishedPostsByCategoryId(ROOT_ID)).thenReturn(10L);
        when(blogPostCoordinationPort.countPublishedPostsByCategoryId(CHILD_ID)).thenReturn(5L);

        List<BlogCategoryPublicResponse> result = blogCategoryService.getPublicCategories();

        assertThat(result).hasSize(2);

        BlogCategoryPublicResponse rootRes = result.getFirst();
        assertThat(rootRes.id()).isEqualTo(ROOT_ID);
        assertThat(rootRes.name()).isEqualTo(ROOT_NAME);
        assertThat(rootRes.slug()).isEqualTo(ROOT_SLUG);
        assertThat(rootRes.avatar()).isEqualTo(ROOT_AVATAR);
        assertThat(rootRes.postCount()).isEqualTo(10L);

        BlogCategoryPublicResponse childRes = result.get(1);
        assertThat(childRes.id()).isEqualTo(CHILD_ID);
        assertThat(childRes.name()).isEqualTo(CHILD_NAME);
        assertThat(childRes.slug()).isEqualTo(CHILD_SLUG);
        assertThat(childRes.postCount()).isEqualTo(5L);

        verify(blogCategoryRepositoryPort).findAllByIsDeletedFalse();
        verify(blogPostCoordinationPort).countPublishedPostsByCategoryId(ROOT_ID);
        verify(blogPostCoordinationPort).countPublishedPostsByCategoryId(CHILD_ID);
    }
}
