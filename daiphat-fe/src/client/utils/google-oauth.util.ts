import { generateCodeChallenge, generateCodeVerifier } from "../../admin/utils/pkce";
import { STORAGE_KEYS } from "../../constants/storage.constants";

export const redirectToGoogleOAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
        throw new Error("Missing GOOGLE_CLIENT_ID configuration");
    }

    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem(STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);
    sessionStorage.setItem(STORAGE_KEYS.OAUTH_REDIRECT_URI, redirectUri);

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
