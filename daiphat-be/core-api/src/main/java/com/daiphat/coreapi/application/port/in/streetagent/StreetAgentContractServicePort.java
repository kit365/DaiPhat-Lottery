package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;

public interface StreetAgentContractServicePort {
    ContractPdfDocument generatePdf(Long profileId);
    String renderPrintHtml(Long profileId);
}
