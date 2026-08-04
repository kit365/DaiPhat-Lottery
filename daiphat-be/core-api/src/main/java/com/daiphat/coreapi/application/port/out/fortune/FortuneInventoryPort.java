package com.daiphat.coreapi.application.port.out.fortune;

import java.time.LocalDate;
import java.util.List;

public interface FortuneInventoryPort {

    /**
     * Distinct last-two-digit tails still sellable for the given draw date.
     */
    List<String> findAvailableTails(LocalDate sellableDrawDate);
}
