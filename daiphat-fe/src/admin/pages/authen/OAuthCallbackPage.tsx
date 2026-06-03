import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "../../constants/routes"
import { useAuth } from "./hooks/useAuth"
import { LoadingSpinner } from "../../../client/components/ui/LoadingSpinner"
import { STORAGE_KEYS } from "../../../constants/storage.constants"

export const OAuthCallbackPage = () => {
    const navigate = useNavigate()
    const { handleOAuthCallback: exchangeToken } = useAuth()
    const hasFetched = useRef(false)

    useEffect(() => {
        if (hasFetched.current) return
        hasFetched.current = true

        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")

        if (!code) {
            const isClient = !window.location.pathname.startsWith(ROUTES.ADMIN.ROOT)
            navigate(isClient ? ROUTES.PUBLIC.HOME : ROUTES.ADMIN.AUTH.LOGIN, { replace: true })
            return
        }

        const redirectUri = sessionStorage.getItem(STORAGE_KEYS.OAUTH_REDIRECT_URI)
            || `${window.location.origin}${window.location.pathname}`
        const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.PKCE_VERIFIER) || undefined

        exchangeToken({ code, redirectUri, codeVerifier })
    }, [navigate, exchangeToken])

    return <LoadingSpinner />
}
