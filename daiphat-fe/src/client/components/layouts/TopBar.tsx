import { Facebook, Instagram, MailSolid } from "iconoir-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettingGeneral } from "../../hooks/useSettings";
import { SocialIcon } from "../ui/SocialIcon";

export const TopBar = () => {
    const { data: general } = useSettingGeneral();

    const socialItems = [
        { icon: Facebook, to: general?.facebook || "#" },
        { icon: Instagram, to: general?.instagram || "#" },
    ];

    const texts = [
        "Ưu đãi mùa hè đã có – Miễn phí giao hàng cho đơn trên 300k!",
        "Đắm chìm trong mùa hè tiết kiệm – Miễn phí vận chuyển trên 300k!",
        "Giá nóng, ưu đãi mát – Nhận giao hàng miễn phí cho đơn trên 300k!"
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % texts.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [texts.length]);

    const handlePrev = () => {
        setIndex((prev) => (prev - 1 + texts.length) % texts.length);
    };

    const handleNext = () => {
        setIndex((prev) => (prev + 1) % texts.length);
    };

    return (
        <>
            <div className="px-[30px] py-[10px] bg-client-primary">
                <div className="flex items-center justify-between app-container">
                    <SocialIcon items={socialItems} />
                    <div className="flex items-center justify-center">
                        <div className="w-[35px] h-[35px] cursor-pointer flex items-center justify-center">
                            <svg
                                onClick={handlePrev}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 100 100"
                                className="w-[20px] h-[20px] shrink-0"
                                fill="white"
                            >
                                <path d="M98.6,45.6c-15.5-5.9-35-4.5-51.5-4.4c-3.2,0-6.4,0-9.6,0.1c4.5-2.6,10.9-5.2,9.8-10.9c-0.7-3.9-4.9-5.9-9.2-5.3 c-3.8,0.6-8.1,3.6-11.4,5.3c-4.2,2.1-8.4,4.2-12.5,6.6c-3.2,1.8-6.5,3.5-8.8,6c-1.2,0.6-2.5,1.4-3.8,2.6c-1.7,1.5-2.4,4.5-0.4,6.1 c0.7,0.5,1.3,1,1.9,1.4c1,2.8,3.4,5.1,6.3,7.1C17,65.3,25.1,70,33.3,74.3c5.9,3,13.4-3.8,8.1-8.4c-3-2.6-5.9-5.3-9.1-7.7 c-0.9-0.7-2.1-1.7-3.3-2.7c6.5-0.1,13-0.3,19.6-0.4c16.2-0.4,35.3,0.3,50.3-5.9C100.6,48.3,100.2,46.2,98.6,45.6z"></path>
                            </svg>
                        </div>
                        <span className="transition-opacity duration-500 ease-in-out shrink-0 text-white px-[40px]">{texts[index]}</span>
                        <div className="w-[35px] h-[35px] cursor-pointer flex items-center justify-center">
                            <svg
                                onClick={handleNext}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 100 100"
                                className="w-[20px] h-[20px] shrink-0"
                                fill="white"
                            >
                                <path d="M1.4,45.6c15.5-5.9,35-4.5,51.5-4.4c3.2,0,6.4,0,9.6,0.1c-4.5-2.6-10.9-5.2-9.8-10.9c0.7-3.9,4.9-5.9,9.2-5.3 c3.8,0.6,8.1,3.6,11.4,5.3c4.2,2.1,8.4,4.2,12.5,6.6c3.2,1.8,6.5,3.5,8.8,6c1.2,0.6,2.5,1.4,3.8,2.6c1.7,1.5,2.4,4.5,0.4,6.1 c-0.7,0.5-1.3,1-1.9,1.4c-1,2.8-3.4,5.1-6.3,7.1C83,65.3,74.9,70,66.7,74.3c-5.9,3-13.4-3.8-8.1-8.4c3-2.6,5.9-5.3,9.1-7.7 c0.9-0.7,2.1-1.7,3.3-2.7c-6.5-0.2-13-0.3-19.6-0.4C35.2,54.5,16.1,55.2,1.1,49C-0.6,48.2-0.2,46.2,1.4,45.6z"></path>
                            </svg>
                        </div>

                    </div>
                    <Link to={"/contact"} className="flex items-center text-white hover:text-[#FFFFFFBF] transition-[color] duration-300">
                        <MailSolid className="w-[17px] h-[17px] mr-[10px] text-white" />
                        <span>{general?.email || "loading..."}</span>
                    </Link>
                </div>
            </div>
        </>
    )
}