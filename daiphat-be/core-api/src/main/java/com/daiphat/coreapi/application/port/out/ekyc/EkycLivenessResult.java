package com.daiphat.coreapi.application.port.out.ekyc;

public record EkycLivenessResult(
        boolean live,
        double score,
        String method,
        String error
) {
}
