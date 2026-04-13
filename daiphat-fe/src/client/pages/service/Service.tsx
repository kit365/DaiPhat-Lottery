import { useState } from "react";
import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner"
import { Section1 } from "./sections/Section1";
import { Section2 } from "./sections/Section2";
import { Section3 } from "./sections/Section3";

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Dịch vụ", to: "/services" },
];

export const ServicePage = () => {
    const [petType, setPetType] = useState<string>("ALL");

    return (
        <>
            <ProductBanner
                pageTitle="Dịch vụ Spa & Hotel"
                breadcrumbs={breadcrumbs}
                url="https://wordpress.themehour.net/babet/wp-content/uploads/2025/07/breadcumb-bg.jpg"
                className="banner-service"
            />
            <div className="bg-white pt-[100px]">
                <Section1 activeType={petType} onTypeChange={setPetType} />
                <Section2 petType={petType} />
            </div>
            <Section3 />
            <FooterSub />
        </>
    )
}