package com.daiphat.coreapi.infrastructure.adapter.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.out.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
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
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (IOException e) {
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    private StorageResult uploadInternal(UploadRequest request, String publicId, boolean overwrite) {
        validateRequest(request);

        Map<String, Object> options = ObjectUtils.asMap(
                "resource_type", "image",
                "overwrite", overwrite
        );
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
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
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
            throw new DomainException(ErrorCode.INVALID_INPUT, "Image data is required");
        }
    }
}
