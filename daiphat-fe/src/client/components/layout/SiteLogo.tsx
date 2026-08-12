'use client';

import React, { useState, useEffect } from 'react';
import { BrandMark } from '@/client/components/auth/SharedAuth';
import { useSiteBranding } from '@/client/hooks/useSiteBranding';

type SiteLogoProps = {
    className?: string;
    imgClassName?: string;
    alt?: string;
    /** Khi không có URL từ setting — hiện BrandMark thay vì ảnh fallback cứng. */
    fallback?: 'mark' | 'none';
};

/**
 * Logo thương hiệu từ SITE_LOGO_URL (admin). Không hardcode ibb / logo.png.
 */
export const SiteLogo = ({
    className = 'w-10 h-10',
    imgClassName = 'w-full h-full object-cover rounded-[inherit]',
    alt,
    fallback = 'mark',
}: SiteLogoProps) => {
    const { logoUrl, name } = useSiteBranding();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR or first client render (before mount) will ignore cached logoUrl to match server output exactly.
    const safeLogoUrl = mounted ? logoUrl : '';

    if (!safeLogoUrl) {
        if (fallback === 'none') return null;
        
        // Trả về Avatar chứa chữ cái đầu tiên (tinh tế hơn)
        const text = alt || name || 'Đại Phát';
        const initial = text.charAt(0).toUpperCase();
        
        return (
            <span 
                className={`inline-flex shrink-0 items-center justify-center bg-[var(--palette-primary-lighter,#FFE7D9)] text-[var(--palette-primary-dark,#B72136)] font-bold text-lg ${className}`}
                title={text}
            >
                {initial}
            </span>
        );
    }

    return (
        <span className={`inline-flex shrink-0 overflow-hidden ${className}`}>
            <img src={safeLogoUrl} alt={alt || name} className={imgClassName} />
        </span>
    );
};
