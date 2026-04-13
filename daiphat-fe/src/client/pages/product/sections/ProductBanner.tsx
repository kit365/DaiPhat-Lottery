import React, { memo } from "react";
import { Link } from "react-router-dom";
import RemoveIcon from "@mui/icons-material/Remove";

interface BreadcrumbItem {
    label: string;
    to: string;
}

interface ProductBannerProps {
    pageTitle: string;
    breadcrumbs: BreadcrumbItem[];
    url: string;
    className?: string;
}

export const ProductBanner = memo(({ pageTitle, breadcrumbs, url, className }: ProductBannerProps) => {
    return (
        <section
            className={`relative px-[30px] py-[150px] 2xl:py-[120px] mb-[150px] 2xl:mb-[120px] 
                 bg-client-secondary bg-center bg-no-repeat bg-cover banner ${className}`}
            style={{ backgroundImage: `url(${url})` }}
        >
            <div className="text-center relative z-[2]">
                {/* Tiêu đề trang */}
                <h1 className="text-[2.5rem] font-secondary text-white mb-[5px]">{pageTitle}</h1>

                {/* Breadcrumb */}
                <nav className="text-white flex justify-center flex-wrap items-center gap-[5px]" aria-label="breadcrumb">
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                            <React.Fragment key={index}>
                                {isLast ? (
                                    <span>{item.label}</span>
                                ) : (
                                    <Link
                                        to={item.to}
                                        className="hover:text-client-secondary transition-colors duration-300 ease-linear"
                                    >
                                        {item.label}
                                    </Link>
                                )}

                                {!isLast && (
                                    <RemoveIcon className="text-white" style={{ fontSize: "10px" }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </nav>
            </div>
        </section>
    );
});