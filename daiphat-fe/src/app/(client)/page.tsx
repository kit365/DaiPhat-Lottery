import { Suspense } from 'react';
import { preload } from 'react-dom';

import { CLIENT_PAGE_BACKGROUND } from '@/client/constants/clientBannerAssets';
import { HomePage } from '@/client/features/home/HomePage';
import { fetchHomeInitialData } from '@/lib/server-lottery';

export const dynamic = 'force-dynamic';

export default async function Home() {
    preload(CLIENT_PAGE_BACKGROUND, { as: 'image' });

    const initialData = await fetchHomeInitialData();

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
            <HomePage initialData={initialData} />
        </Suspense>
    );
}
