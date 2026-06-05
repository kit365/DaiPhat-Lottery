package com.daiphat.coreapi.adapter.in.web.controller.blogs;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.blog.CreateBlogTagRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogTagResponse;
import com.daiphat.coreapi.application.port.in.blog.BlogTagServicePort;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/blogs/tags")
@RequiredArgsConstructor
public class BlogTagController {

    private static final String ID_PATH = "/{id}";
    private static final String ALL_PATH = "/all";

    private final BlogTagServicePort blogTagServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<PageResponse<BlogTagResponse>>> getTags(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "search", required = false) String search) {

        PageResponse<BlogTagResponse> response = blogTagServicePort.getTags(page, limit, search);
        return ResponseEntity.ok(ApiResponse.<PageResponse<BlogTagResponse>>builder()
                .data(response)
                .message("Lấy danh sách tag thành công")
                .build());
    }

    @GetMapping(ALL_PATH)
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<List<BlogTagResponse>>> getAllTags() {
        List<BlogTagResponse> response = blogTagServicePort.getAllTags();
        return ResponseEntity.ok(ApiResponse.<List<BlogTagResponse>>builder()
                .data(response)
                .message("Lấy toàn bộ tag thành công")
                .build());
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('article:view')")
    public ResponseEntity<ApiResponse<BlogTagResponse>> getTagById(@PathVariable(name = "id") Long id) {
        BlogTagResponse response = blogTagServicePort.getTagById(id);
        return ResponseEntity.ok(ApiResponse.<BlogTagResponse>builder()
                .data(response)
                .message("Lấy chi tiết tag thành công")
                .build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('article:create')")
    public ResponseEntity<ApiResponse<BlogTagResponse>> createTag(
            @Valid @RequestBody CreateBlogTagRequest request) {

        BlogTagResponse response = blogTagServicePort.createTag(request);
        return ResponseEntity.ok(ApiResponse.<BlogTagResponse>builder()
                .data(response)
                .message("Tạo tag thành công")
                .build());
    }

    @PatchMapping(ID_PATH)
    @PreAuthorize("hasAuthority('article:edit')")
    public ResponseEntity<ApiResponse<BlogTagResponse>> updateTag(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody CreateBlogTagRequest request) {

        BlogTagResponse response = blogTagServicePort.updateTag(id, request);
        return ResponseEntity.ok(ApiResponse.<BlogTagResponse>builder()
                .data(response)
                .message("Cập nhật tag thành công")
                .build());
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAuthority('article:delete')")
    public ResponseEntity<ApiResponse<Void>> deleteTag(@PathVariable(name = "id") Long id) {
        blogTagServicePort.deleteTag(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Xóa tag thành công")
                .build());
    }
}

