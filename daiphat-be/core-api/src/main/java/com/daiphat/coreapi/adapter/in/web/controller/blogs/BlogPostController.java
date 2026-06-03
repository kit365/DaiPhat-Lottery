package com.daiphat.coreapi.adapter.in.web.controller.blogs;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.shared.util.SearchConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/blogs")
@RequiredArgsConstructor
public class BlogPostController {

    private static final String DEFAULT_PAGE= "1";
    private static final String DEFAULT_LIMIT= "10";

    private final BlogPostServicePort blogPostServicePort;

    @GetMapping("/types")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BlogPostTypeResponse>>> getBlogTypes() {
        return ResponseEntity.ok(ApiResponse.<List<BlogPostTypeResponse>>builder()
                .data(blogPostServicePort.getBlogTypes())
                .message("Lấy danh sách loại bài viết thành công")
                .build());
    }


    @GetMapping
    @PreAuthorize("hasAnyAuthority('article:view')")
    public ApiResponse<PageResponse<BlogPostSummaryResponse>> getPosts(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_DIRECTION) String direction,
            @RequestParam(defaultValue = "false") boolean includeDeleted) {

        return ApiResponse.success(
                "Lấy danh sách bài viết thành công",
                blogPostServicePort.getPosts(page, limit, q, tagId, categoryId, type, status, sortBy, direction, includeDeleted)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('article:create')")
    public ResponseEntity<ApiResponse<BlogPostResponse>> createPost(
            @Valid @RequestBody CreateBlogPostRequest request) {
        
        String msg = "Tạo bài viết mới thành công";
        BlogPostResponse response = blogPostServicePort.createPost(request);

        return ResponseEntity.ok(ApiResponse.<BlogPostResponse>builder()
                .data(response)
                .message(msg)
                .build());
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('article:create', 'article:edit')")
    public ApiResponse<StorageResult> uploadImage(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "blog-content") String folder) {
        
        return ApiResponse.success("Tải ảnh lên thành công",
                blogPostServicePort.uploadImage(StorageUtils.toUploadRequest(file), folder));
    }


    @PatchMapping("/{id}/view")
    public ApiResponse<Void> incrementView(@PathVariable Long id) {
        blogPostServicePort.incrementViewCount(id);
        return ApiResponse.success("Tăng lượt xem thành công", null);
    }
}
