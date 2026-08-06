import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StaticPageView } from '@/client/features/static-page/StaticPageView';
import { getStaticPage, STATIC_PAGE_SLUGS } from '@/client/constants/staticPages';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return STATIC_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const page = getStaticPage(slug);
    return {
        title: page?.title ?? 'Trang không tồn tại',
        description: page?.description,
    };
}

export default async function StaticPage({ params }: PageProps) {
    const { slug } = await params;
    return (
        <Suspense
            fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}
        >
            <StaticPageView slug={slug} />
        </Suspense>
    );
}
