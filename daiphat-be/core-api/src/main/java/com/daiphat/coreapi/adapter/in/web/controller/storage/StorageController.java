package com.daiphat.coreapi.adapter.in.web.controller.storage;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.storage.DeleteStoredFileRequest;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/storage")
@RequiredArgsConstructor
@Validated
public class StorageController {

    private final StoragePort storagePort;

    @PostMapping("/delete")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> deleteStoredFile(@RequestBody DeleteStoredFileRequest request) {
        String publicId = request != null && request.publicId() != null && !request.publicId().isBlank()
                ? request.publicId().trim()
                : StorageUtils.extractStorageKeyFromUrl(request != null ? request.url() : null);
        if (publicId == null || publicId.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu url hoặc publicId để xóa tệp.");
        }
        storagePort.delete(publicId);
        return ApiResponse.success("Đã xóa tệp khỏi kho lưu trữ.", null);
    }
}
