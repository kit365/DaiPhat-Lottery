import { Typography, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getClientPage } from "../../api/setting.api";
import { ProductBanner } from "../product/sections/ProductBanner";
import { FooterSub } from "../../components/layouts/FooterSub";

export const StaticPage = () => {
    const { type } = useParams();
    const location = useLocation();
    const [pageData, setPageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const keyMap: Record<string, string> = {
        'about': 'page-about',
        'privacy': 'page-privacy',
        'terms': 'page-terms',
        'shipping': 'page-shipping',
        'returns': 'page-returns',
        'stores': 'page-stores'
    };

    const currentType = type || location.pathname.split('/').pop() || '';
    const pageKey = keyMap[currentType] || `page-${currentType}`;

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const res = await getClientPage(pageKey);
                if ((res as any).code === 200) {
                    setPageData(res.data);
                }
            } catch (error) {
                console.error("Error fetching static page:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
        window.scrollTo(0, 0);
    }, [pageKey]);

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: pageData?.title || "Trang", to: location.pathname },
    ];

    if (loading) return (
        <div className="app-container py-[100px]">
            <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: '20px' }} />
        </div>
    );

    if (!pageData) return (
        <div className="app-container py-[100px] text-center">
            <Typography variant="h4" color="error">Trang không tồn tại</Typography>
            <a href="/" className="text-client-primary underline mt-4 inline-block">Quay lại trang chủ</a>
        </div>
    );

    return (
        <>
            <ProductBanner
                pageTitle={pageData.title || "Thông tin"}
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-about-pet.jpg"
            />

            <section className="relative px-[30px] bg-white pt-[80px] pb-[100px]">
                <div className="app-container max-w-[1000px] mx-auto min-h-[400px]">
                    <div className="bg-white p-[50px] 2xl:p-[40px] rounded-[40px] shadow-custom-card border border-[#eee]">
                        <div
                            className="tiptap-content text-[#505050] text-[18px] leading-relaxed
                                [&_h1]:text-[36px] [&_h1]:font-secondary [&_h1]:text-client-secondary [&_h1]:mb-[20px]
                                [&_h2]:text-[30px] [&_h2]:font-secondary [&_h2]:text-client-secondary [&_h2]:mb-[15px] [&_h2]:mt-[30px]
                                [&_h3]:text-[24px] [&_h3]:font-secondary [&_h3]:text-client-secondary [&_h3]:mb-[10px] [&_h3]:mt-[20px]
                                [&_p]:mb-[15px]
                                [&_ul]:list-disc [&_ul]:pl-[20px] [&_ul]:mb-[15px]
                                [&_ol]:list-decimal [&_ol]:pl-[20px] [&_ol]:mb-[15px]
                                [&_img]:rounded-[20px] [&_img]:my-[20px] [&_img]:mx-auto [&_img]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: pageData.content }}
                        />
                    </div>
                </div>
            </section>

            <FooterSub />
        </>
    );
};


