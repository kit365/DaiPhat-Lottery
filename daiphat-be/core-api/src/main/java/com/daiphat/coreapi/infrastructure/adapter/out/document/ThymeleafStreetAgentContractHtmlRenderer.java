package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.dto.document.StreetAgentContractTemplateData;
import com.daiphat.coreapi.application.port.out.document.StreetAgentContractHtmlRendererPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class ThymeleafStreetAgentContractHtmlRenderer implements StreetAgentContractHtmlRendererPort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final String TEMPLATE = "streetagent/contract";

    private final SpringTemplateEngine templateEngine;

    @Override
    public String render(StreetAgentContractTemplateData contract) {
        Context context = new Context(VIETNAMESE);
        context.setVariable("contract", contract);
        return templateEngine.process(TEMPLATE, context);
    }
}
