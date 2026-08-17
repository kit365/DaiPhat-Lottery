package com.daiphat.coreapi.infrastructure.adapter.out.document;

import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData;
import com.daiphat.coreapi.application.port.out.document.SupplierSettlementReconciliationReportHtmlRendererPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Locale;

@Component
@RequiredArgsConstructor
public class ThymeleafSupplierSettlementReconciliationReportHtmlRenderer
        implements SupplierSettlementReconciliationReportHtmlRendererPort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final String TEMPLATE = "lotteries/supplier-settlement-reconciliation-report";

    private final SpringTemplateEngine templateEngine;

    @Override
    public String render(SupplierSettlementReconciliationReportTemplateData report) {
        Context context = new Context(VIETNAMESE);
        context.setVariable("report", report);
        return templateEngine.process(TEMPLATE, context);
    }
}
