'use client';

import React, { useState, useEffect } from 'react';
import { useSiteBranding } from '@/client/hooks/useSiteBranding';

type SiteLogoProps = {
    className?: string;
    imgClassName?: string;
    alt?: string;
};

/**
 * Logo thương hiệu: SITE_LOGO_URL từ cấu hình, fallback ảnh client (ibb).
 */
export const SiteLogo = ({
    className = 'w-10 h-10',
    imgClassName = 'w-full h-full object-contain rounded-[inherit]',
    alt,
}: SiteLogoProps) => {
    const { logoUrl, name } = useSiteBranding();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const safeLogoUrl = mounted ? logoUrl : '';

    if (!safeLogoUrl) {
        return null;
    }

    return (
        <span className={`inline-flex shrink-0 overflow-hidden ${className}`}>
            <img src={safeLogoUrl} alt={alt || name} className={imgClassName} />
        </span>
    );
};
