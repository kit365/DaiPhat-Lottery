package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.dto.document.PrizePayoutConfirmationContractTemplateData;
import com.daiphat.coreapi.application.port.out.document.PrizePayoutConfirmationContractHtmlRendererPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class ThymeleafPrizePayoutConfirmationContractHtmlRenderer
        implements PrizePayoutConfirmationContractHtmlRendererPort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final String TEMPLATE = "payout/confirmation-contract";

    private final SpringTemplateEngine templateEngine;

    @Override
    public String render(PrizePayoutConfirmationContractTemplateData contract) {
        Context context = new Context(VIETNAMESE);
        context.setVariable("contract", contract);
        return templateEngine.process(TEMPLATE, context);
    }
}
