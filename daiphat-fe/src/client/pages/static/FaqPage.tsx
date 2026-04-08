import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";
import { getClientPage } from "../../api/setting.api";
import { Icon } from "@iconify/react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { FooterSub } from "../../components/layouts/FooterSub";

export const FaqPage = () => {
    const [pageData, setPageData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const res = await getClientPage('page-faq');
                if ((res as any).code === 200) {
                    setPageData(res.data);
                }
            } catch (error) {
                console.error("Error fetching FAQ page:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
        window.scrollTo(0, 0);
    }, []);

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "FAQ", to: "/faq" },
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
                pageTitle={pageData.title || "Câu hỏi thường gặp"}
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-faq.jpg"
            />

            <section className="relative px-[30px] bg-white pt-[80px] pb-[100px]">
                <div className="app-container">
                    <div className="text-center mb-[60px]">
                        <h2 className="text-[40px] font-secondary text-client-secondary mb-[20px]">
                            Chúng tôi có thể giúp gì cho bạn?
                        </h2>
                        {pageData.content && (
                            <div
                                className="tiptap-content max-w-[800px] mx-auto text-[#505050] text-[18px] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: pageData.content }}
                            />
                        )}
                    </div>

                    <div className="max-w-[900px] mx-auto">
                        <div className="grid gap-[20px]">
                            {pageData.items?.map((item: any, index: number) => (
                                <Accordion
                                    key={index}
                                    sx={{
                                        borderRadius: '20px !important',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                        border: 'none',
                                        '&:before': { display: 'none' },
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                            boxShadow: '0 15px 40px rgba(0,0,0,0.1)',
                                        }
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<Icon icon="eva:chevron-down-fill" className="text-client-primary w-[24px] h-[24px]" />}
                                        sx={{
                                            px: '30px',
                                            py: '10px',
                                            '& .MuiAccordionSummary-content': {
                                                my: '15px'
                                            }
                                        }}
                                    >
                                        <Typography sx={{
                                            fontWeight: 700,
                                            fontSize: '20px',
                                            fontFamily: 'Barlow, sans-serif',
                                            color: 'var(--palette-text-primary)'
                                        }}>
                                            {item.question}
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: '30px', pb: '30px' }}>
                                        <Typography sx={{
                                            fontSize: '16px',
                                            lineHeight: 1.8,
                                            color: '#637381'
                                        }}>
                                            {item.answer}
                                        </Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </div>

                        {/* If no structured items, just render the content if it wasn't rendered above */}
                        {!pageData.items && pageData.content && (
                            <div
                                className="tiptap-content bg-[#f9f9f9] p-[40px] rounded-[30px]"
                                dangerouslySetInnerHTML={{ __html: pageData.content }}
                            />
                        )}
                    </div>
                </div>
            </section>

            <FooterSub />
        </>
    );
};

