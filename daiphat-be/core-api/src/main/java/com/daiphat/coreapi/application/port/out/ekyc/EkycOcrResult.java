package com.daiphat.coreapi.application.port.out.ekyc;

public record EkycOcrResult(
        boolean valid,
        String name,
        String idNumber,
        String dob,
        String address,
        String expiryDate,
        String error
) {
}
