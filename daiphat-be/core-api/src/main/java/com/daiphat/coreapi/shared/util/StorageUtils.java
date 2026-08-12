package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public final class StorageUtils {

    private StorageUtils() {}

    public static UploadRequest toUploadRequest(MultipartFile file) {
        try {
            return new UploadRequest(
                    file.getBytes(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    null
            );
        } catch (IOException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cannot read uploaded image");
        }
    }

    public static void validateImageUpload(UploadRequest request) {
        if (request == null || request.data() == null || request.data().length == 0) {
            throw new DomainException(ErrorCode.IMAGE_FILE_REQUIRED);
        }
        if (request.contentType() == null || !request.contentType().startsWith("image/")) {
            throw new DomainException(ErrorCode.IMAGE_INVALID_TYPE);
        }
    }

    public static void validateImageEvidenceUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "URL minh chứng chuyển khoản là bắt buộc.");
        }
        String trimmed = url.trim();
        // Cloudinary returns absolute https://...; local storage returns /uploads/... when
        // daiphat.storage.local.public-base-url is empty (see application-local.yml).
        if (!isAbsoluteHttpUrl(trimmed) && !isSafeRelativeUploadUrl(trimmed)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "URL minh chứng chuyển khoản không hợp lệ.");
        }
    }

    private static boolean isAbsoluteHttpUrl(String url) {
        return url.startsWith("http://") || url.startsWith("https://");
    }

    private static boolean isSafeRelativeUploadUrl(String url) {
        return url.startsWith("/")
                && !url.startsWith("//")
                && !url.contains("..");
    }
}
