package com.daiphat.coreapi.application.dto.request.storage;

public record DeleteStoredFileRequest(
        String url,
        String publicId
) {
}
