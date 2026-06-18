package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

public final class LotterySourceDocumentSupport {

    private LotterySourceDocumentSupport() {
    }

    public static Document parse(LotterySourceCrawlData crawlData) {
        return Jsoup.parse(crawlData.rawHtml(), crawlData.requestUrl());
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
