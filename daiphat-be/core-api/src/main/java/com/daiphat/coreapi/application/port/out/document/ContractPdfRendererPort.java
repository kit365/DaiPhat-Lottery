package com.daiphat.coreapi.application.port.out.document;

public interface ContractPdfRendererPort {
    byte[] renderPdf(String html);
}
