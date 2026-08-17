package com.daiphat.coreapi.application.port.out.document;

import com.daiphat.coreapi.application.dto.document.StreetAgentContractTemplateData;

/** Renders the contract template without exposing a template-engine dependency to application services. */
public interface StreetAgentContractHtmlRendererPort {
    String render(StreetAgentContractTemplateData contract);
}
