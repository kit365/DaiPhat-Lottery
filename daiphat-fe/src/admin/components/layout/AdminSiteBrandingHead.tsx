'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePublicSystemConfigValues } from '@/client/hooks/usePublicSystemConfigValues';
import { buildRouteDocumentTitle } from '@/client/constants/routeTitles';

const ADMIN_BRANDING_KEYS = ['SITE_NAME', 'SITE_FAVICON_URL'] as const;

const ADMIN_BRANDING_DEFAULTS = {
    SITE_NAME: 'ĐẠI PHÁT Admin',
    SITE_FAVICON_URL: '',
} as const;

/**
 * Lightweight branding for admin shell — only title + favicon (1 API call).
 * Client pages keep full SiteBrandingHead with all public keys.
 */
export function AdminSiteBrandingHead() {
    const pathname = usePathname() || '/';
    const values = usePublicSystemConfigValues(ADMIN_BRANDING_KEYS, ADMIN_BRANDING_DEFAULTS);
    const name = values.SITE_NAME;
    const faviconUrl = values.SITE_FAVICON_URL?.trim() || '';

    useEffect(() => {
        document.title = buildRouteDocumentTitle(pathname, name);
    }, [pathname, name]);

    useEffect(() => {
        if (!faviconUrl || faviconUrl.startsWith('blob:') || faviconUrl.startsWith('data:')) {
            return;
        }

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
}
