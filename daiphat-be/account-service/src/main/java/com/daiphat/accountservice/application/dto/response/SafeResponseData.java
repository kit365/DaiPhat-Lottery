package com.daiphat.accountservice.application.dto.response;

/**
 * Marker interface for DTOs that are safe to be returned in exception data payloads.
 * This prevents accidental leakage of sensitive internal data while allowing useful
 * diagnostic information (like lockout time) to reach the client.
 */
public interface SafeResponseData {
}
