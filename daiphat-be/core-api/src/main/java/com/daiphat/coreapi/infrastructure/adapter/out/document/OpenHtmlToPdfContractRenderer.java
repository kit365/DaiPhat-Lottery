package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Component
public class OpenHtmlToPdfContractRenderer implements ContractPdfRendererPort {

    private static final String FONT_FAMILY = "Noto Sans";
    private static final String FONT_FAMILY_BOLD = "Noto Sans Bold";

    @Override
    public byte[] renderPdf(String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.useFont(() -> font("fonts/NotoSans-Regular.ttf"), FONT_FAMILY);
            builder.useFont(() -> font("fonts/NotoSans-Bold.ttf"), FONT_FAMILY_BOLD);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể sinh PDF hợp đồng đại lý.", ex);
        }
    }

    private InputStream font(String path) {
        try {
            return new ClassPathResource(path).getInputStream();
        } catch (IOException ex) {
            throw new IllegalStateException("Không thể tải font PDF: " + path, ex);
        }
    }
}
