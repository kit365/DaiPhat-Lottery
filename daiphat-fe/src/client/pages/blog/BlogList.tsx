import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useQuery } from "@tanstack/react-query";
import { getPublicBlogs } from "../../api/blog.api";
import { AppCard } from "../../components/ui/AppCard";

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Bài viết", to: "/blogs" },
];

export const BlogListPage = () => {
    const { data: blogsRes, isLoading } = useQuery({
        queryKey: ['public-blogs'],
        queryFn: getPublicBlogs
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-client-primary"></div>
            </div>
        );
    }

    const blogsData = blogsRes?.data || [];
    let blogs: any[] = [];
    if (Array.isArray(blogsData)) {
        blogs = blogsData;
    } else if (blogsData.recordList && Array.isArray(blogsData.recordList)) {
        blogs = blogsData.recordList;
    }

    return (
        <>
            <ProductBanner pageTitle="Bài viết" breadcrumbs={breadcrumbs} url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-blog-listing.jpg" />
            <section className="relative px-[30px] bg-white pt-[80px]">
                <div className="app-container grid grid-cols-3 gap-[30px] relative">
                    {blogs.map((blog: any) => (
                        <AppCard key={blog._id} data={blog} type="blog" />
                    ))}
                </div>

                {blogs.length === 0 && !isLoading && (
                    <div className="text-center py-20 italic text-gray-400">
                        Chưa có bài viết nào được đăng tải...
                    </div>
                )}

                <ul className="flex items-center mt-[65px] 2xl:mt-[40px] justify-center gap-[11px] pb-[150px] 2xl:pb-[120px]">
                    <li className="flex items-center cursor-pointer justify-center bg-client-secondary text-white rounded-full w-[45px] h-[45px]">1</li>
                    <li className="flex items-center cursor-pointer justify-center bg-client-primary hover:bg-client-secondary transition-default text-white rounded-full w-[45px] h-[45px]">2</li>
                    <div className="w-[45px] h-[45px] rounded-full bg-client-primary hover:bg-client-secondary cursor-pointer transition-default flex items-center justify-center next-button"></div>
                </ul>
            </section>
            <FooterSub />
        </>
    )
}