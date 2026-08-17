package com.daiphat.coreapi.application.port.out.document;

import com.daiphat.coreapi.application.dto.document.PrizePayoutConfirmationContractTemplateData;

public interface PrizePayoutConfirmationContractHtmlRendererPort {
    String render(PrizePayoutConfirmationContractTemplateData contract);
}
