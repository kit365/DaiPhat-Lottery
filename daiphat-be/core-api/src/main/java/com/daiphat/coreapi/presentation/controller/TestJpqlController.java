package com.daiphat.coreapi.presentation.controller;

import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/test-jpql")
@RequiredArgsConstructor
public class TestJpqlController {

    private final LotteryTicketSerialRepository repository;

    @GetMapping
    public Object testJpql() {
        return repository.aggregateInventoryByStationForSettlement(1L);
    }
}
