package com.daiphat.coreapi.adapter.in.web.controller.blogs;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostStatusResponse;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
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
@DisplayName("BlogPostController Unit Tests")
class BlogPostControllerTest {

    private BlogPostController blogPostController;

    @Mock
    private BlogPostServicePort blogPostServicePort;

    @BeforeEach
    void setUp() {
        blogPostController = new BlogPostController(blogPostServicePort);
    }

    @Test
    @DisplayName("GET /public: Lấy danh sách bài viết công khai thành công")
    void getPublicPosts_success() {
        // GIVEN
        int page = 1;
        int limit = 5;
        String query = "test";
        Long categoryId = 10L;
        String sortBy = "createdAt";
        String direction = "desc";

        PageResponse<BlogPostSummaryResponse> serviceResponse = PageResponse.<BlogPostSummaryResponse>builder()
                .recordList(Collections.emptyList())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(0L)
                        .totalPages(1)
                        .currentPage(page)
                        .limit(limit)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();

        when(blogPostServicePort.getPosts(
                page, limit, query, null, categoryId, null, PostStatus.PUBLISHED.getCode(), sortBy, direction, false
        )).thenReturn(serviceResponse);

        // WHEN
        ApiResponse<PageResponse<BlogPostSummaryResponse>> response = blogPostController.getPublicPosts(
                page, limit, query, categoryId, sortBy, direction
        );

        // THEN
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Lấy danh sách bài viết công khai thành công");
        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(blogPostServicePort).getPosts(
                page, limit, query, null, categoryId, null, PostStatus.PUBLISHED.getCode(), sortBy, direction, false
        );
    }

    @Test
    @DisplayName("GET /statuses: Lấy danh sách trạng thái bài viết thành công")
    void getBlogStatuses_success() {
        // GIVEN
        List<BlogPostStatusResponse> mockStatuses = List.of(
                new BlogPostStatusResponse("draft", "Bản nháp"),
                new BlogPostStatusResponse("published", "Đăng công khai")
        );
        when(blogPostServicePort.getBlogStatuses()).thenReturn(mockStatuses);

        // WHEN
        ResponseEntity<ApiResponse<List<BlogPostStatusResponse>>> responseEntity = blogPostController.getBlogStatuses();

        // THEN
        assertThat(responseEntity).isNotNull();
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        ApiResponse<List<BlogPostStatusResponse>> body = responseEntity.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isTrue();
        assertThat(body.getMessage()).isEqualTo("Lấy danh sách trạng thái bài viết thành công");
        assertThat(body.getData()).isEqualTo(mockStatuses);
        verify(blogPostServicePort).getBlogStatuses();
    }
}
