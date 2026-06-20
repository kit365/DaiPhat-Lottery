package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import org.jsoup.nodes.Document;

import java.util.Map;

public record LotterySourceDocumentBundle(
        Map<String, LotterySourceCrawlData> crawlDataByUrl,
        Map<String, Document> documentByUrl,
        LotterySourceCrawlData primaryPageData,
        Document primaryDocument
) {
}
