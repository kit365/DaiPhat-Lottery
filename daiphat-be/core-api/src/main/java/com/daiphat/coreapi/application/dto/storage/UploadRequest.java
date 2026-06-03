package com.daiphat.coreapi.application.dto.storage;

public record UploadRequest(
        byte[] data,
        String fileName,
        String contentType,
        String folder
) {
}
