package com.daiphat.coreapi.infrastructure.adapter.out.payment;

import com.daiphat.coreapi.application.port.out.refund.VietQrGatewayPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.refund.VietQrBankModel;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Component
@Slf4j
public class VietQrGatewayAdapter implements VietQrGatewayPort {

    private static final String BANKS_URL = "https://api.vietqr.io/v2/banks";
    private static final Duration CACHE_TTL = Duration.ofHours(24);
    private static final String SUCCESS_CODE = "00";

    private final RestClient restClient = RestClient.create();
    private final ReentrantLock cacheLock = new ReentrantLock();

    private volatile List<VietQrBankModel> cachedBanks = List.of();
    private volatile Instant cacheExpiresAt = Instant.EPOCH;

    @Override
    public List<VietQrBankModel> getBanks() {
        return List.copyOf(loadBanks());
    }

    @Override
    public Optional<VietQrBankModel> findByBin(String bankBin) {
        if (bankBin == null || bankBin.isBlank()) {
            return Optional.empty();
        }
        String normalizedBin = bankBin.trim();
        return loadBanks().stream()
                .filter(bank -> normalizedBin.equals(bank.getBin()))
                .findFirst();
    }

    private List<VietQrBankModel> loadBanks() {
        if (Instant.now().isBefore(cacheExpiresAt) && !cachedBanks.isEmpty()) {
            return cachedBanks;
        }

        cacheLock.lock();
        try {
            if (Instant.now().isBefore(cacheExpiresAt) && !cachedBanks.isEmpty()) {
                return cachedBanks;
            }

            cachedBanks = fetchBanksFromApi();
            cacheExpiresAt = Instant.now().plus(CACHE_TTL);
            return cachedBanks;
        } finally {
            cacheLock.unlock();
        }
    }

    private List<VietQrBankModel> fetchBanksFromApi() {
        try {
            JsonNode root = restClient.get()
                    .uri(BANKS_URL)
                    .retrieve()
                    .body(JsonNode.class);

            if (root == null || !SUCCESS_CODE.equals(root.path("code").asText())) {
                log.warn("VietQR banks API returned unexpected response: {}", root);
                throw new DomainException(ErrorCode.VIETQR_BANK_LIST_UNAVAILABLE);
            }

            JsonNode data = root.path("data");
            if (!data.isArray()) {
                throw new DomainException(ErrorCode.VIETQR_BANK_LIST_UNAVAILABLE);
            }

            List<VietQrBankModel> banks = new ArrayList<>();
            for (JsonNode node : data) {
                String bin = textValue(node, "bin");
                if (bin == null || bin.isBlank()) {
                    continue;
                }
                banks.add(VietQrBankModel.builder()
                        .code(textValue(node, "code"))
                        .bin(bin)
                        .name(textValue(node, "name"))
                        .shortName(firstNonBlank(
                                textValue(node, "shortName"),
                                textValue(node, "short_name")))
                        .logo(textValue(node, "logo"))
                        .build());
            }

            if (banks.isEmpty()) {
                throw new DomainException(ErrorCode.VIETQR_BANK_LIST_UNAVAILABLE);
            }

            return List.copyOf(banks);
        } catch (DomainException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.error("Failed to fetch VietQR bank list", ex);
            throw new DomainException(ErrorCode.VIETQR_BANK_LIST_UNAVAILABLE);
        }
    }

    private static String textValue(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }
}
