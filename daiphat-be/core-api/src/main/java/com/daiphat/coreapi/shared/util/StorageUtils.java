package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public final class StorageUtils {

    /** OCR field boxes need a readable ticket photo — reject 1×1 / placeholder PNGs. */
    public static final int OCR_SAMPLE_MIN_WIDTH = 200;
    public static final int OCR_SAMPLE_MIN_HEIGHT = 200;
    private static final int OCR_SAMPLE_MIN_BYTES = 2_048;

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

    /**
     * OCR ticket templates must be real photographs. Tiny/debug images (e.g. 1×1 PNG)
     * still upload to Cloudinary and replace {@code sample_image_url}, which looks like
     * a solid color block in the annotator after reload.
     */
    public static void validateOcrTemplateSampleImage(UploadRequest request) {
        validateImageUpload(request);
        if (request.data().length < OCR_SAMPLE_MIN_BYTES) {
            throw new DomainException(
                    ErrorCode.IMAGE_DIMENSIONS_TOO_SMALL,
                    null,
                    OCR_SAMPLE_MIN_WIDTH,
                    OCR_SAMPLE_MIN_HEIGHT
            );
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(request.data()));
            if (image == null) {
                throw new DomainException(ErrorCode.IMAGE_INVALID_TYPE);
            }
            if (image.getWidth() < OCR_SAMPLE_MIN_WIDTH || image.getHeight() < OCR_SAMPLE_MIN_HEIGHT) {
                throw new DomainException(
                        ErrorCode.IMAGE_DIMENSIONS_TOO_SMALL,
                        null,
                        OCR_SAMPLE_MIN_WIDTH,
                        OCR_SAMPLE_MIN_HEIGHT
                );
            }
        } catch (IOException e) {
            throw new DomainException(ErrorCode.IMAGE_INVALID_TYPE, e);
        }
    }

    /**
     * Import-batch invoice / ticket-list evidence: images, PDF, Excel, or CSV
     * (operators may upload the supplier file instead of photographing it).
     */
    public static void validateImportEvidenceUpload(UploadRequest request) {
        if (request == null || request.data() == null || request.data().length == 0) {
            throw new DomainException(ErrorCode.IMAGE_FILE_REQUIRED);
        }
        if (!isAllowedImportEvidenceContentType(request.contentType(), request.fileName())) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_EVIDENCE_INVALID_TYPE);
        }
    }

    public static boolean isAllowedImportEvidenceContentType(String contentType, String fileName) {
        String type = contentType == null ? "" : contentType.trim().toLowerCase();
        if (type.startsWith("image/")) {
            return true;
        }
        if (type.equals("application/pdf")
                || type.equals("text/csv")
                || type.equals("application/csv")
                || type.equals("application/vnd.ms-excel")
                || type.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                || type.equals("application/vnd.ms-excel.sheet.macroenabled.12")) {
            return true;
        }
        // Some browsers send octet-stream; fall back to extension.
        String name = fileName == null ? "" : fileName.trim().toLowerCase();
        return name.endsWith(".pdf")
                || name.endsWith(".csv")
                || name.endsWith(".xls")
                || name.endsWith(".xlsx")
                || name.endsWith(".xlsm")
                || name.endsWith(".jpg")
                || name.endsWith(".jpeg")
                || name.endsWith(".png")
                || name.endsWith(".webp")
                || name.endsWith(".gif");
    }

    /**
     * Derive storage public id / relative key from a stored public URL.
     * Supports Cloudinary secure URLs and local {@code /uploads/...} paths.
     */
    public static String extractStorageKeyFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        int hash = trimmed.indexOf('#');
        if (hash >= 0) {
            trimmed = trimmed.substring(0, hash);
        }
        int query = trimmed.indexOf('?');
        if (query >= 0) {
            trimmed = trimmed.substring(0, query);
        }

        // Local adapter: /uploads/{relativeKey} or http(s)://host/uploads/{relativeKey}
        int uploadsIdx = trimmed.indexOf("/uploads/");
        if (uploadsIdx >= 0) {
            String relative = trimmed.substring(uploadsIdx + "/uploads/".length());
            return relative.isBlank() ? null : relative;
        }
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.contains("..")) {
            return trimmed.replaceFirst("^/+", "");
        }

        // Cloudinary: .../(image|raw|video)/upload/[transforms/][v123/]{public_id}[.ext]
        int uploadMarker = trimmed.indexOf("/upload/");
        if (uploadMarker < 0) {
            return null;
        }
        String afterUpload = trimmed.substring(uploadMarker + "/upload/".length());
        String[] parts = afterUpload.split("/");
        int start = 0;
        while (start < parts.length) {
            String part = parts[start];
            if (part.isBlank()) {
                start++;
                continue;
            }
            // Skip transformation segments (contain '_') and version (v123456).
            if (part.matches("v\\d+") || part.contains(",")) {
                start++;
                continue;
            }
            break;
        }
        if (start >= parts.length) {
            return null;
        }
        StringBuilder publicId = new StringBuilder();
        for (int i = start; i < parts.length; i++) {
            if (i > start) {
                publicId.append('/');
            }
            publicId.append(parts[i]);
        }
        String key = publicId.toString();
        // Image public ids usually omit extension; keep as-is if no extension or for raw docs keep full.
        int lastSlash = key.lastIndexOf('/');
        String fileName = lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
        int dot = fileName.lastIndexOf('.');
        if (dot > 0) {
            String withoutExt = (lastSlash >= 0 ? key.substring(0, lastSlash + 1) : "") + fileName.substring(0, dot);
            // Prefer without extension for destroy(image); Cloudinary adapter also tries raw.
            return withoutExt;
        }
        return key.isBlank() ? null : key;
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
