package com.daiphat.coreapi.adapter.in.web.controller.blogs;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryPublicResponse;
import com.daiphat.coreapi.application.dto.response.blog.CategoryStatusResponse;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BlogCategoryController Unit Tests")
class BlogCategoryControllerTest {

    private BlogCategoryController blogCategoryController;

    @Mock
    private BlogCategoryServicePort blogCategoryServicePort;

    @BeforeEach
    void setUp() {
        blogCategoryController = new BlogCategoryController(blogCategoryServicePort);
    }

    @Test
    @DisplayName("GET /public: Lấy danh sách danh mục công khai thành công")
    void getPublicCategories_success() {
        // GIVEN
        List<BlogCategoryPublicResponse> mockCategories = List.of(
                new BlogCategoryPublicResponse(1L, "Kinh nghiệm chơi số", "kinh-nghiem", "icon", 5L),
                new BlogCategoryPublicResponse(2L, "Tin tức", "tin-tuc", "icon", 3L)
        );
        when(blogCategoryServicePort.getPublicCategories()).thenReturn(mockCategories);

        // WHEN
        ResponseEntity<ApiResponse<List<BlogCategoryPublicResponse>>> responseEntity = blogCategoryController.getPublicCategories();

        // THEN
        assertThat(responseEntity).isNotNull();
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        ApiResponse<List<BlogCategoryPublicResponse>> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getMessage()).isEqualTo("Lấy danh sách danh mục công khai thành công");
        assertThat(body.getData()).isEqualTo(mockCategories);
        verify(blogCategoryServicePort).getPublicCategories();
    }

    @Test
    @DisplayName("GET /statuses: Lấy danh sách trạng thái danh mục thành công")
    void getStatuses_success() {
        // WHEN
        ResponseEntity<ApiResponse<List<CategoryStatusResponse>>> responseEntity = blogCategoryController.getStatuses();

        // THEN
        assertThat(responseEntity).isNotNull();
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        ApiResponse<List<CategoryStatusResponse>> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getMessage()).isEqualTo("Lấy danh sách trạng thái danh mục thành công");
        assertThat(body.getData()).isNotEmpty();
    }
}
