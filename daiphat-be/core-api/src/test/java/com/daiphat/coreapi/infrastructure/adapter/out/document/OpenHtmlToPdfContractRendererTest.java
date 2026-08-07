package com.daiphat.coreapi.infrastructure.adapter.out.document;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OpenHtmlToPdfContractRenderer")
class OpenHtmlToPdfContractRendererTest {

    @Test
    @DisplayName("sinh PDF hợp lệ với nội dung tiếng Việt")
    void renderPdf_returnsPdfSignature() {
        OpenHtmlToPdfContractRenderer renderer = new OpenHtmlToPdfContractRenderer();

        byte[] pdf = renderer.renderPdf("""
                <!DOCTYPE html><html><head><style>
                body { font-family: 'Noto Sans'; } strong { font-family: 'Noto Sans Bold'; }
                </style></head><body><strong>HỢP ĐỒNG ĐẠI LÝ</strong><p>Đại Phát - vé số kiến thiết</p></body></html>
                """);

        assertThat(pdf).startsWith("%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        assertThat(pdf.length).isGreaterThan(500);
    }
}
