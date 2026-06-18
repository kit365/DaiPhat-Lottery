package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.LotterySourceCrawlData;

public interface LotterySourceCrawlerPort {

    LotterySourceCrawlData fetch(String url);
}
