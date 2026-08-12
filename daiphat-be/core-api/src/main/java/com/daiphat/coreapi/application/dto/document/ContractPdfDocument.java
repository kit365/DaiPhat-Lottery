package com.daiphat.coreapi.application.dto.document;

/** Binary document returned by the vendor contract application service. */
public record ContractPdfDocument(byte[] content, String fileName) {
    public ContractPdfDocument {
        content = content == null ? new byte[0] : content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
