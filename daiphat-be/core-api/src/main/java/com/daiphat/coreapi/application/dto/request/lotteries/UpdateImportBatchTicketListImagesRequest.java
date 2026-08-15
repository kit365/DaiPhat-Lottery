package com.daiphat.coreapi.application.dto.request.lotteries;

import java.util.List;

public record UpdateImportBatchTicketListImagesRequest(
        List<String> urls
) {
}
