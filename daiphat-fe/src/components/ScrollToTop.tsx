import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '../utils/scroll.util';

/**
 * Resets window scroll on every route change (pathname and query string).
 */
export function ScrollToTop() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        scrollToTop();
    }, [pathname, search]);

    return null;
}
