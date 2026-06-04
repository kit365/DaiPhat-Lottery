package com.daiphat.coreapi.application.service.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryTreeResponse;
import com.daiphat.coreapi.application.mapper.blog.BlogCategoryApplicationMapper;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
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
@DisplayName("Core BlogCategoryService Unit Tests")
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
    private com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort blogPostServicePort;

    private BlogCategoryModel rootCategory;
    private BlogCategoryModel childCategory;
    private BlogCategoryResponse rootResponse;

    @BeforeEach
    void setUp() {
        blogCategoryService = new BlogCategoryService(blogCategoryRepositoryPort, blogCategoryApplicationMapper, blogPostServicePort);

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

        rootResponse = new BlogCategoryResponse(
                ROOT_ID,
                null,
                null,
                ROOT_NAME,
                ROOT_SLUG,
                ROOT_DESC,
                1,
                false,
                STATUS_ACTIVE,
                ROOT_AVATAR,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
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
        BlogCategoryTreeResponse rootNode = result.get(0);
        assertThat(rootNode.id()).isEqualTo(ROOT_ID);
        assertThat(rootNode.children()).hasSize(1);
        assertThat(rootNode.children().get(0).id()).isEqualTo(CHILD_ID);
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

        BlogCategoryResponse expectedResponse = new BlogCategoryResponse(
                3L, null, null, NEW_CAT_NAME, NEW_CAT_SLUG, NEW_CAT_DESC, 6, false, STATUS_ACTIVE, NEW_CAT_AVATAR, LocalDateTime.now(), LocalDateTime.now()
        );

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

        BlogCategoryResponse expectedResponse = new BlogCategoryResponse(
                4L, ROOT_ID, ROOT_NAME, CUSTOM_CHILD_NAME, CUSTOM_CHILD_SLUG, CUSTOM_CHILD_DESC, 3, false, STATUS_ACTIVE, null, LocalDateTime.now(), LocalDateTime.now()
        );

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
    void createCategory_slugExisted_throwsSlugExisted() {
        CreateBlogCategoryRequest request = new CreateBlogCategoryRequest("Existed Slug", "existed-slug", null, null, null, STATUS_ACTIVE, null);
        when(blogCategoryRepositoryPort.existsBySlug("existed-slug")).thenReturn(true);

        assertThatThrownBy(() -> blogCategoryService.createCategory(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SLUG_EXISTED);
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

        BlogCategoryResponse expectedResponse = new BlogCategoryResponse(
                ROOT_ID, null, null, UPDATED_CAT_NAME, UPDATED_CAT_SLUG, UPDATED_CAT_DESC, 2, false, STATUS_ACTIVE, UPDATED_CAT_AVATAR, LocalDateTime.now(), LocalDateTime.now()
        );

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
        verify(blogPostServicePort).clearCategoryForPosts(List.of(ROOT_ID));
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
        verify(blogPostServicePort).clearCategoryForPosts(List.of(ROOT_ID, CHILD_ID));
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
        verify(blogPostServicePort).clearCategoryForPosts(List.of(CHILD_ID));
    }

    @Test
    void deleteCategory_notFound_throwsCategoryNotFound() {
        when(blogCategoryRepositoryPort.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blogCategoryService.deleteCategory(99L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CATEGORY_NOT_FOUND);

        verify(blogPostServicePort, never()).clearCategoryForPosts(any());
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
        verify(blogPostServicePort).clearCategoryForPosts(List.of(ROOT_ID));
    }
}
