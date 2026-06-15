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
}
