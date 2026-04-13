import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from "swiper";
import { useRef } from "react";
import { AppCard } from "../../../components/ui/AppCard";
import { useServices } from "../../../hooks/useService";

interface ServiceRelatedProps {
    categoryId: string;
    currentServiceId: string;
}

export const ServiceRelated = ({ categoryId, currentServiceId }: ServiceRelatedProps) => {
    const prevButtonRef = useRef<HTMLDivElement>(null);
    const nextButtonRef = useRef<HTMLDivElement>(null);

    const { data: services = [] } = useServices({ categoryId });
    const relatedServices = services.filter((s: any) => s._id !== currentServiceId).slice(0, 8);

    if (relatedServices.length === 0) return null;

    return (
        <div className="app-container pb-[150px] 2xl:pb-[120px] relative">
            <h2 className="text-[35px] 2xl:text-[28px] font-secondary text-client-secondary mb-[40px]">Dịch vụ liên quan</h2>
            <div className="flex gap-[10px] absolute top-[0%] right-0">
                <div ref={prevButtonRef} className="w-[50px] h-[50px] rounded-full bg-client-primary hover:bg-client-secondary cursor-pointer transition-default flex items-center justify-center prev-button"></div>
                <div ref={nextButtonRef} className="w-[50px] h-[50px] rounded-full bg-client-primary hover:bg-client-secondary cursor-pointer transition-default flex items-center justify-center next-button"></div>
            </div>

            <Swiper
                modules={[Navigation]}
                slidesPerView={3}
                spaceBetween={30}
                navigation={{
                    prevEl: prevButtonRef.current,
                    nextEl: nextButtonRef.current,
                }}
                onBeforeInit={(swiper: SwiperType) => {
                    if (
                        swiper.params.navigation &&
                        typeof swiper.params.navigation !== "boolean"
                    ) {
                        swiper.params.navigation.prevEl = prevButtonRef.current;
                        swiper.params.navigation.nextEl = nextButtonRef.current;
                    }
                }}
                className="mySwiper"
            >
                {relatedServices.map((item: any) => (
                    <SwiperSlide key={item._id}>
                        <AppCard data={item} type="service" />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}
