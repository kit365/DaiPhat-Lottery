package com.daiphat.coreapi.application.dto.document;

/** Binary spreadsheet response independent of the business report that produced it. */
public record SpreadsheetDocument(byte[] content, String fileName, String contentType) {
    public SpreadsheetDocument {
        content = content == null ? new byte[0] : content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
