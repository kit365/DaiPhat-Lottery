package com.daiphat.coreapi.infrastructure.adapter.out.storage;

import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

/**
 * Filesystem storage for local/dev when Cloudinary credentials are placeholders
 * ({@code CLOUDINARY_CLOUD_NAME=local-cloud}).
 */
@Component
@ConditionalOnProperty(name = "daiphat.storage.provider", havingValue = "local")
public class LocalFileStorageAdapter implements StoragePort {

    private final Path baseDir;
    private final String publicBaseUrl;

    public LocalFileStorageAdapter(
            @Value("${daiphat.storage.local.base-dir:./data/uploads}") String baseDir,
            @Value("${daiphat.storage.local.public-base-url:}") String publicBaseUrl
    ) {
        this.baseDir = Path.of(baseDir).toAbsolutePath().normalize();
        String trimmed = publicBaseUrl == null ? "" : publicBaseUrl.trim().replaceAll("/+$", "");
        this.publicBaseUrl = trimmed.isBlank() ? "/uploads" : trimmed;
        try {
            Files.createDirectories(this.baseDir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create local upload directory: " + this.baseDir, e);
        }
    }

    @Override
    public StorageResult upload(UploadRequest request) {
        validateRequest(request);
        String relativeKey = buildRelativeKey(request.folder(), request.fileName(), null);
        return write(relativeKey, request.data());
    }

    @Override
    public StorageResult overwrite(String publicId, UploadRequest request) {
        if (publicId == null || publicId.isBlank()) {
            return upload(request);
        }
        validateRequest(request);
        String relativeKey = sanitizePublicId(publicId);
        return write(relativeKey, request.data());
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            Path target = resolveSafe(sanitizePublicId(publicId));
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new DomainException(ErrorCode.IMAGE_UPLOAD_FAILED, e);
        }
    }

    private StorageResult write(String relativeKey, byte[] data) {
        try {
            Path target = resolveSafe(relativeKey);
            Files.createDirectories(target.getParent());
            Files.write(target, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return new StorageResult(relativeKey, toPublicUrl(relativeKey));
        } catch (IOException e) {
            throw new DomainException(ErrorCode.IMAGE_UPLOAD_FAILED, e);
        }
    }

    private String buildRelativeKey(String folder, String fileName, String forcedName) {
        String safeFolder = trimSlashes(folder);
        String extension = extensionOf(fileName);
        String name = forcedName != null && !forcedName.isBlank()
                ? forcedName
                : UUID.randomUUID().toString().replace("-", "");
        String filePart = extension.isBlank() ? name : name + "." + extension;
        return safeFolder.isBlank() ? filePart : safeFolder + "/" + filePart;
    }

    private String toPublicUrl(String relativeKey) {
        return publicBaseUrl + "/" + relativeKey.replace('\\', '/');
    }

    private Path resolveSafe(String relativeKey) {
        Path resolved = baseDir.resolve(relativeKey).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Invalid storage path");
        }
        return resolved;
    }

    private String sanitizePublicId(String publicId) {
        String normalized = publicId.replace('\\', '/').replaceAll("^/+", "");
        if (normalized.contains("..")) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Invalid storage public id");
        }
        return normalized;
    }

    private String extensionOf(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "bin";
        }
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) {
            return "bin";
        }
        String ext = fileName.substring(idx + 1).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return ext.isBlank() ? "bin" : ext;
    }

    private String trimSlashes(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("^/+|/+$", "").replace('\\', '/');
    }

    private void validateRequest(UploadRequest request) {
        if (request == null || request.data() == null || request.data().length == 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Image data is required");
        }
    }
}
