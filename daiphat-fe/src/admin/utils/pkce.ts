/**
 * PKCE (Proof Key for Code Exchange) Utility
 * 
 * Provides functions to generate code verifiers and challenges for OAuth2 flows.
 * Uses Web Crypto API for high-entropy randomness and SHA-256 hashing.
 */

/**
 * Generates a high-entropy random string (Code Verifier).
 * Standard requires a length between 43 and 128 characters.
 * @param length The length of the verifier (default 64)
 */
export const generateCodeVerifier = (length: number = 64): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    return Array.from(values)
        .map((x) => charset[x % charset.length])
        .join('');
};

/**
 * Generates a SHA-256 challenge from a code verifier.
 * Base64URL encodes the hash (no padding, URL-safe characters).
 * @param verifier The code verifier string
 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    
    // Convert ArrayBuffer to Base64URL string
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};
