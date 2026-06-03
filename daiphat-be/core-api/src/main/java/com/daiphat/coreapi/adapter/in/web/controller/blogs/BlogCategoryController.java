package com.daiphat.coreapi.adapter.in.web.controller.blogs;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryTreeResponse;
import com.daiphat.coreapi.application.port.in.blog.BlogCategoryServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.daiphat.coreapi.application.dto.response.blog.CategoryStatusResponse;
import com.daiphat.coreapi.domain.model.enums.blog.CategoryStatus;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/blogs/categories")
@RequiredArgsConstructor
public class BlogCategoryController {

    private static final String ID_PATH = "/{id}";
    private static final String NESTED_PATH = "/nested";
    private static final String DELETE_PATH = ID_PATH + "/delete";
    private static final String RESTORE_PATH = ID_PATH + "/restore";
    private static final String FORCE_PATH = ID_PATH + "/force";

    private final BlogCategoryServicePort blogCategoryServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<PageResponse<BlogCategoryResponse>>> getCategories(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "isTrash", defaultValue = "false") boolean isTrash) {

        PageResponse<BlogCategoryResponse> response = blogCategoryServicePort.getCategories(page, limit, search, isTrash);
        return ResponseEntity.ok(ApiResponse.<PageResponse<BlogCategoryResponse>>builder()
                .data(response)
                .message("Lấy danh sách danh mục thành công")
                .build());
    }

    @GetMapping(NESTED_PATH)
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<List<BlogCategoryTreeResponse>>> getNestedCategories() {
        List<BlogCategoryTreeResponse> response = blogCategoryServicePort.getNestedCategories();
        return ResponseEntity.ok(ApiResponse.<List<BlogCategoryTreeResponse>>builder()
                .data(response)
                .message("Lấy danh sách danh mục phân cấp thành công")
                .build());
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<CategoryStatusResponse>>> getStatuses() {
        List<CategoryStatusResponse> statuses = Arrays.stream(CategoryStatus.values())
                .map(status -> CategoryStatusResponse.builder()
                        .code(status.getCode())
                        .name(status.getLabel())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.<List<CategoryStatusResponse>>builder()
                .data(statuses)
                .message("Lấy danh sách trạng thái danh mục thành công")
                .build());
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<BlogCategoryResponse>> getCategoryById(@PathVariable(name = "id") Long id) {
        BlogCategoryResponse response = blogCategoryServicePort.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.<BlogCategoryResponse>builder()
                .data(response)
                .message("Lấy chi tiết danh mục thành công")
                .build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('article:create')")
    public ResponseEntity<ApiResponse<BlogCategoryResponse>> createCategory(
            @Valid @RequestBody CreateBlogCategoryRequest request) {

        BlogCategoryResponse response = blogCategoryServicePort.createCategory(request);
        return ResponseEntity.ok(ApiResponse.<BlogCategoryResponse>builder()
                .data(response)
                .message("Tạo danh mục thành công")
                .build());
    }

    @PatchMapping(ID_PATH)
    @PreAuthorize("hasAuthority('article:edit')")
    public ResponseEntity<ApiResponse<BlogCategoryResponse>> updateCategory(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody CreateBlogCategoryRequest request) {

        BlogCategoryResponse response = blogCategoryServicePort.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.<BlogCategoryResponse>builder()
                .data(response)
                .message("Cập nhật danh mục thành công")
                .build());
    }

    @PatchMapping(DELETE_PATH)
    @PreAuthorize("hasAuthority('article:delete')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable(name = "id") Long id) {
        blogCategoryServicePort.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Xóa danh mục thành công")
                .build());
    }

    @PatchMapping(RESTORE_PATH)
    @PreAuthorize("hasAuthority('article:delete')")
    public ResponseEntity<ApiResponse<Void>> restoreCategory(@PathVariable(name = "id") Long id) {
        blogCategoryServicePort.restoreCategory(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Khôi phục danh mục thành công")
                .build());
    }

    @DeleteMapping(FORCE_PATH)
    @PreAuthorize("hasAuthority('article:delete')")
    public ResponseEntity<ApiResponse<Void>> forceDeleteCategory(@PathVariable(name = "id") Long id) {
        blogCategoryServicePort.forceDeleteCategory(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Xóa vĩnh viễn danh mục thành công")
                .build());
    }
}

