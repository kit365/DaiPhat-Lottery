package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySourceCrawlerPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class LotterySourceCrawlerAdapter implements LotterySourceCrawlerPort {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    @Value("${daiphat.lottery.crawler.user-agent}")
    private String userAgent;

    @Override
    public LotterySourceCrawlData fetch(String url) {
        try {
            Connection.Response response = Jsoup.connect(url)
                    .userAgent(userAgent)
                    .timeout((int) TIMEOUT.toMillis())
                    .ignoreContentType(true)
                    .execute();

            return LotterySourceCrawlData.builder()
                    .requestUrl(url)
                    .rawHtml(response.body())
                    .fetchedAt(LocalDateTime.now())
                    .build();
        } catch (IOException e) {
            throw new DomainException(
                    ErrorCode.INTERNAL_SERVER_ERROR,
                    "Không thể tải dữ liệu từ nguồn " + url + ": " + e.getMessage()
            );
        }
    }
}
