'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteBranding } from '@/client/hooks/useSiteBranding';
import { buildRouteDocumentTitle } from '@/client/constants/routeTitles';

/**
 * Favicon từ SITE_FAVICON_URL.
 * document.title theo route: "{Trang} | {SITE_NAME}".
 */
export const SiteBrandingHead = () => {
    const pathname = usePathname() || '/';
    const { name, slogan, faviconUrl } = useSiteBranding();

    useEffect(() => {
        document.title = buildRouteDocumentTitle(pathname, name, slogan);
    }, [pathname, name, slogan]);

    useEffect(() => {
        if (!faviconUrl) return;

        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = faviconUrl;

        let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
        if (!apple) {
            apple = document.createElement('link');
            apple.rel = 'apple-touch-icon';
            document.head.appendChild(apple);
        }
        apple.href = faviconUrl;
    }, [faviconUrl]);

    return null;
};
