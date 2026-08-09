"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useEffect, useRef } from "react"
import { ROUTES } from "../../constants/routes"
import { useAuth } from "./hooks/useAuth"
import { LoadingSpinner } from "../../../client/components/ui/LoadingSpinner"
import { STORAGE_KEYS } from "../../../constants/storage.constants"

export const OAuthCallbackPage = () => {
    const router = useAdminRouter()
    const { handleOAuthCallback: exchangeToken } = useAuth()
    const hasFetched = useRef(false)

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true

        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")

        if (!code) {
            const isClient = !window.location.pathname.startsWith(ROUTES.ADMIN.ROOT)
            router.replace(isClient ? ROUTES.PUBLIC.HOME : ROUTES.ADMIN.AUTH.LOGIN)
            return
        }

        const redirectUri = sessionStorage.getItem(STORAGE_KEYS.OAUTH_REDIRECT_URI)
            || `${window.location.origin}${window.location.pathname}`
        const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER) || undefined

        exchangeToken({ code, redirectUri, codeVerifier })
    }, [router, exchangeToken])

    return <LoadingSpinner />
}
