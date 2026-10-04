package com.daiphat.coreapi.domain.model.lotteries;

import java.time.Instant;

/** An uploaded image awaiting an explicit scan request from the web client. */
public record OcrSessionImage(String id, String imageUrl, String fileName, String contentType, Instant uploadedAt) {}
