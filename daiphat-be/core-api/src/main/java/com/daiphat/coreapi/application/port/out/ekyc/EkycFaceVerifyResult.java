package com.daiphat.coreapi.application.port.out.ekyc;

public record EkycFaceVerifyResult(
        boolean verified,
        double distance,
        double score,
        String method,
        String error
) {
}
