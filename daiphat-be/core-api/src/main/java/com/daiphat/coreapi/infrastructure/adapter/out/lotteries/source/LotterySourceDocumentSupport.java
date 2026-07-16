package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class LotterySourceDocumentSupport {

    private LotterySourceDocumentSupport() {
    }

    public static Document parse(LotterySourceCrawlData crawlData) {
        return Jsoup.parse(crawlData.rawHtml(), crawlData.requestUrl());
    }

    public static LotterySourceDocumentBundle fetchDocuments(
            List<String> sourceUrls,
            java.util.function.Function<String, LotterySourceCrawlData> fetcher
    ) {
        Map<String, LotterySourceCrawlData> crawlDataByUrl = new LinkedHashMap<>();
        Map<String, Document> documentByUrl = new LinkedHashMap<>();

        for (String sourceUrl : sourceUrls) {
            LotterySourceCrawlData pageData = fetcher.apply(sourceUrl);
            crawlDataByUrl.put(sourceUrl, pageData);
            documentByUrl.put(sourceUrl, parse(pageData));
        }

        String primaryUrl = sourceUrls.isEmpty() ? null : sourceUrls.getFirst();
        return new LotterySourceDocumentBundle(
                crawlDataByUrl,
                documentByUrl,
                primaryUrl != null ? crawlDataByUrl.get(primaryUrl) : null,
                primaryUrl != null ? documentByUrl.get(primaryUrl) : null
        );
    }

    public static String wholeText(Document document) {
        return document == null ? "" : document.wholeText();
    }

    public static String rawPreview(Document document) {
        if (document == null) {
            return null;
        }
        String html = document.outerHtml();
        return html.length() <= 2000 ? html : html.substring(0, 2000);
    }
}
