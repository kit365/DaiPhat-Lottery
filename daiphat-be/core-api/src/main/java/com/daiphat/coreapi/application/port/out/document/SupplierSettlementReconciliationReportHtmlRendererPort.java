package com.daiphat.coreapi.application.port.out.document;

import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData;

public interface SupplierSettlementReconciliationReportHtmlRendererPort {
    String render(SupplierSettlementReconciliationReportTemplateData report);
}
