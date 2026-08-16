package com.daiphat.coreapi.infrastructure.adapter.out.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "daiphat.storage.provider", havingValue = "cloudinary", matchIfMissing = true)
public class CloudinaryStorageAdapter implements StoragePort {

    private final Cloudinary cloudinary;

    @Value("${daiphat.storage.cloudinary.root-folder}")
    private String rootFolder;

    @Override
    public StorageResult upload(UploadRequest request) {
        return uploadInternal(request, null, false);
    }

    @Override
    public StorageResult overwrite(String publicId, UploadRequest request) {
        if (publicId == null || publicId.isBlank()) {
            return upload(request);
        }
        return uploadInternal(request, publicId, true);
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        // Public ids do not encode resource type; try image then raw (signed PDFs).
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (IOException ignored) {
            // fall through
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "raw"));
        } catch (IOException e) {
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    private StorageResult uploadInternal(UploadRequest request, String publicId, boolean overwrite) {
        validateRequest(request);

        String resourceType = resolveResourceType(request);
        Map<String, Object> options = ObjectUtils.asMap(
                "resource_type", resourceType,
                "overwrite", overwrite
        );
        // Keep original filename for raw PDFs so browsers get a usable Content-Type/extension.
        if ("raw".equals(resourceType) && request.fileName() != null && !request.fileName().isBlank()) {
            options.put("use_filename", true);
            options.put("unique_filename", true);
        }
        if (publicId != null && !publicId.isBlank()) {
            options.put("public_id", publicId);
        } else {
            options.put("folder", resolveFolder(request.folder()));
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(request.data(), options);
            return new StorageResult(
                    (String) result.get("public_id"),
                    (String) result.get("secure_url")
            );
        } catch (IOException e) {
            throw new DomainException(ErrorCode.IMAGE_UPLOAD_FAILED, e);
        }
    }

    /**
     * Cloudinary cannot serve PDFs as {@code resource_type=image}. Signed contracts and other
     * non-image binaries must use {@code raw}.
     */
    static String resolveResourceType(UploadRequest request) {
        String contentType = request.contentType() == null
                ? ""
                : request.contentType().trim().toLowerCase(Locale.ROOT);
        String fileName = request.fileName() == null
                ? ""
                : request.fileName().trim().toLowerCase(Locale.ROOT);

        if (contentType.equals("application/pdf") || fileName.endsWith(".pdf")) {
            return "raw";
        }
        if (contentType.startsWith("image/")
                || fileName.endsWith(".jpg")
                || fileName.endsWith(".jpeg")
                || fileName.endsWith(".png")
                || fileName.endsWith(".gif")
                || fileName.endsWith(".webp")) {
            return "image";
        }
        if (!contentType.isBlank() && !contentType.startsWith("image/")) {
            return "raw";
        }
        return "image";
    }

    private String resolveFolder(String folder) {
        String normalizedRoot = trimSlashes(rootFolder);
        String normalizedFolder = trimSlashes(folder);
        return normalizedFolder.isBlank() ? normalizedRoot : normalizedRoot + "/" + normalizedFolder;
    }

    private String trimSlashes(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("^/+|/+$", "");
    }

    private void validateRequest(UploadRequest request) {
        if (request == null || request.data() == null || request.data().length == 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "File data is required");
        }
    }
}
