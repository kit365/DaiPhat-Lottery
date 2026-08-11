'use client';

import Link from "next/link";
import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronRight } from 'lucide-react';
import { getPublicSystemConfigByKey } from '@/client/services/systemConfigService';
import { getStaticPage, type StaticPageConfigKey } from '@/client/constants/staticPages';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';
import { Breadcrumb } from '@/client/components/ui/Breadcrumb';

type StaticPageContent = { title: string; content: string };

const PAGE_BG =
    'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")';

const parsePageJson = (raw?: string | null): StaticPageContent => {
    if (!raw?.trim()) {
        return { title: '', content: '' };
    }
    try {
        const parsed = JSON.parse(raw) as Partial<StaticPageContent>;
        return { title: parsed.title ?? '', content: parsed.content ?? '' };
    } catch {
        return { title: '', content: raw };
    }
};

/** Tiptap để lại thẻ rỗng khi admin xoá hết chữ — coi như chưa có nội dung. */
const hasContent = (html: string): boolean =>
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

const EmptyState = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[280px]">
        <FileText size={48} strokeWidth={1.25} className="text-slate-300 mb-4" aria-hidden />
        <p className="text-slate-500 font-medium text-[15px] mb-1">Nội dung đang được cập nhật</p>
        <p className="text-slate-400 text-[13.5px] max-w-md leading-relaxed">
            Trang &ldquo;{title}&rdquo; sẽ sớm có mặt. Vui lòng quay lại sau.
        </p>
        <Link
            href="/"
            className="mt-6 text-[13.5px] font-semibold text-[#637381] hover:text-[#212B36] transition-colors duration-200"
        >
            Về trang chủ
        </Link>
    </div>
);

const PageBody = ({ configKey, title }: { configKey?: StaticPageConfigKey; title: string }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['public-system-config', configKey],
        queryFn: () => getPublicSystemConfigByKey(configKey as string),
        enabled: Boolean(configKey),
        staleTime: 5 * 60 * 1000,
        retry: false,
        throwOnError: false,
    });

    if (!configKey) {
        return <EmptyState title={title} />;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 min-h-[280px]">
                <LoadingSpinner />
            </div>
        );
    }

    const { content } = parsePageJson(data?.configValue);

    if (!hasContent(content)) {
        return <EmptyState title={title} />;
    }

    return (
        <div
            className="prose max-w-none text-[15px] text-[#454F5B] leading-[1.8] blog-content-html p-5 lg:p-8"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export const StaticPageView = ({ slug }: { slug: string }) => {
    const page = getStaticPage(slug);
    const title = page?.title ?? 'Trang không tồn tại';

    return (
        <div
            className="client-page relative min-h-screen overflow-x-hidden bg-fixed bg-cover bg-center"
            style={{ backgroundImage: PAGE_BG }}
        >
            <main className="relative z-1 pt-[148px] pb-[100px] lg:pt-[100px] lg:pb-20">
                <div className="max-w-[1280px] mx-auto px-4 xl:px-0">
                    <section className="mb-6 flex flex-col items-start">
                        <Breadcrumb
                            items={[
                                { label: 'Trang chủ', to: '/' },
                                { label: title }
                            ]}
                            className="mb-2"
                        />
                        <h1 className="client-heading m-0 mb-2">{title}</h1>
                        {page?.description ? (
                            <p className="text-[#637381] text-[13px]">{page.description}</p>
                        ) : null}
                    </section>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.05)] overflow-hidden">
                        <PageBody configKey={page?.configKey} title={title} />
                    </div>
                </div>
            </main>
        </div>
    );
};
