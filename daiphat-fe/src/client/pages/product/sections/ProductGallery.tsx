import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Thumbs, Mousewheel, Navigation } from 'swiper/modules';
import { Swiper as SwiperCore } from 'swiper';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/thumbs';
import 'swiper/css/navigation';

interface ProductGalleryProps {
    images: string[];
}

export const ProductGallery = ({ images }: ProductGalleryProps) => {
    const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);

    const displayImages = images?.length > 0 ? images : ['https://via.placeholder.com/1000x1048?text=No+Image'];

    return (
        <div className="flex w-full gap-[20px] 2xl:gap-[12px] sticky top-[20px] h-[603px] 2xl:h-[522.75px]">
            <div className={`w-[135.5px] 2xl:w-[115.125px] h-full`}>
                <Swiper
                    onSwiper={setThumbsSwiper}
                    direction="vertical"
                    modules={[FreeMode, Thumbs, Mousewheel]}
                    spaceBetween={20}
                    slidesPerView={4}
                    freeMode={true}
                    watchSlidesProgress={true}
                    mousewheel={true}
                    className="thumbs-slider-vertical w-full h-full"
                >
                    {displayImages.map((image, index) => (
                        <SwiperSlide
                            key={index}
                            className="swiper-thumbnail-item border border-[#D7D7D7] cursor-pointer rounded-[10px] overflow-hidden p-[3px] !h-[calc((100%-60px)/4)]"
                        >
                            <img
                                src={image}
                                alt={`Thumbnail ${index}`}
                                className="w-full h-full object-cover rounded-[10px]"
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
            <div
                className={`w-[571px] h-[600px] 2xl:w-[499px] 2xl:h-[522.75px]`}
                style={{
                    '--swiper-navigation-color': '#FF6262',
                    '--swiper-navigation-size': '25px'
                } as React.CSSProperties}
            >
                <Swiper
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    modules={[FreeMode, Thumbs, Navigation]}
                    spaceBetween={10}
                    navigation={true}
                    className="main-slider-horizontal rounded-[10px] h-full border border-[#D7D7D7]"
                >
                    {displayImages.map((image, index) => (
                        <SwiperSlide key={index} className="h-full">
                            <img
                                src={image}
                                alt={`Product image ${index}`}
                                className="w-full h-full object-cover"
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
};