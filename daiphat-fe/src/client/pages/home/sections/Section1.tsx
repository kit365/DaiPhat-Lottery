import { Link } from "react-router-dom"
import { Button } from "../../../components/ui/Button"

export const Section1 = () => {
    return (
        <>
            <section className="px-[30px] pt-[120px] bg-[linear-gradient(-90deg,#FF6262_10%,#FF9466_100%)] section-1">
                <div className="app-container flex gap-[30px]">
                    <section className="text-white pl-[80px] w-[50%] relative section-1-left">
                        <p className="uppercase mb-[10px] text-[0.875rem] font-bold">Kết Nối Yêu Thương Cùng Thú Cưng</p>
                        <h1 className="font-secondary text-[2.5rem] leading-[1.2] mb-[17px]">
                            Khởi đầu hành trình của mỗi thú cưng với tình yêu thương.
                        </h1>
                        <p className="pr-[20%] mb-[40px]">
                            Trải nghiệm những khoảnh khắc đáng nhớ cùng thú cưng của bạn. Chúng tôi mang đến sự chăm sóc, niềm vui và kết nối tuyệt vời cho mọi hành trình.
                        </p>
                        <div className="flex gap-[30px]">
                            <Button
                                content="Xem thêm"
                                hoverBackground="group-hover:bg-client-secondary"
                                hoverSvgColor="group-hover:text-client-secondary"
                                textColor="text-client-secondary"
                                hoverTextColor="group-hover:text-white"
                                iconColor="before:bg-client-secondary after:bg-client-secondary"
                                hoverIconColor="hover:before:bg-white hover:after:bg-white"
                            />
                            <div className="flex items-center">
                                <Link to="/">
                                    <img src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/rate-group-img.png" alt="" />
                                </Link>
                                <span className="w-[55px] h-[55px] rounded-full border-[2px] border-solid border-white bg-[#e67e20] inline-flex justify-center items-center mr-[10px] ml-[-20px]">2k+</span>
                                <p className="w-[100px] leading-[19.2px]">Khách hàng hài lòng</p>
                            </div>
                        </div>
                    </section>
                    <div className="w-[47%] relative section-1-image">
                        <img
                            src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/h1-slider-imgs.png"
                            width={600}
                            height={750}
                            alt=""
                            className="object-cover ml-[50px] relative z-20"
                        />
                        <div className="text-[60px] absolute top-[-5%] right-[4%] 2xl:top-[-13%] 2xl:right-[-2%] z-10 rotate-[180deg]">
                            <svg className="w-[700px] h-[700px] 2xl:w-[600px] 2xl:h-[600px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
                                <defs>
                                    <linearGradient
                                        id="wdt-blob-gradient-clr"
                                        gradientUnits="userSpaceOnUse"
                                        x1="0.7143"
                                        y1="367.4854"
                                        x2="740.5252"
                                        y2="367.4854"
                                    >
                                        <stop offset="0" stopColor="#FF9466" />
                                        <stop offset="0.9" stopColor="#fb4c4c" />
                                    </linearGradient>
                                </defs>
                                <path fill="url(#wdt-blob-gradient-clr)">
                                    <animate
                                        attributeName="d"
                                        dur="5s"
                                        repeatCount="indefinite"
                                        values="
                                            M419.5,311.5Q411,383,342,404.5Q273,426,200,431Q127,436,80.5,375.5Q34,315,45,244Q56,173,89,104Q122,35,199.5,31.5Q277,28,324,79Q371,130,399.5,185Q428,240,419.5,311.5Z;
                                            M432.5,306Q397,372,335,400.5Q273,429,205.5,423.5Q138,418,87,366Q36,314,54,246.5Q72,179,109.5,129Q147,79,208,76Q269,73,332,91.5Q395,110,431.5,175Q468,240,432.5,306Z;
                                            M429,310Q407,380,342.5,416.5Q278,453,216.5,419.5Q155,386,92.5,351Q30,316,28,239Q26,162,86.5,120.5Q147,79,209,72Q271,65,323.5,95Q376,125,413.5,182.5Q451,240,429,310Z;
                                            M419.5,311.5Q411,383,342,404.5Q273,426,200,431Q127,436,80.5,375.5Q34,315,45,244Q56,173,89,104Q122,35,199.5,31.5Q277,28,324,79Q371,130,399.5,185Q428,240,419.5,311.5Z
                                        "
                                    />
                                </path>
                            </svg>
                        </div>
                        <div className="p-[14px] absolute top-[10%] right-[14%] z-30 2xl:top-[9%] 2xl:right-[5%] flex items-center justify-center w-[100px] h-[97px] 2xl:w-[86px] 2xl:h-[84.4px] bg-transparent rounded-full shadow-[0_0_100px_1px_#FB4C4C] bg-[linear-gradient(90deg,#FF9466_10%,#FB4C4CC2_100%)]">
                            <div className="w-[50px] h-[50px] text-[#FFFFFF40]">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" x="0px" y="0px" viewBox="0 0 100 100"><g>	<path d="M19.6,58.3c14.3-5.3,18.5-17.8,29.4-13.4c0.5,0.2,0.9,0.4,1.5,0.7c0,0,0.1,0,0.1,0c0.5,0.3,1,0.5,1.4,0.8  c10,6.3,2.3,17,6.4,31.7c1.8,6.5-1.6,14.5-7.8,17.3c-7.4,3.3-10.2-3-18-8c-0.4-0.3-0.8-0.5-1.2-0.7c-0.3-0.2-0.7-0.4-1-0.5  c-0.2-0.1-0.3-0.2-0.5-0.3c-0.2-0.1-1.2-0.6-1.5-0.7c-0.4-0.2-0.8-0.4-1.3-0.5c-8.6-3.4-15.4-2-17-9.9C8.8,68,13.3,60.6,19.6,58.3  L19.6,58.3z"></path>	<path d="M19.6,58.3c14.3-5.3,18.5-17.8,29.4-13.4c0.5,0.2,0.9,0.4,1.5,0.7c0,0,0.1,0,0.1,0c0.5,0.3,1,0.5,1.4,0.8  c10,6.3,2.3,17,6.4,31.7c1.8,6.5-1.6,14.5-7.8,17.3c-7.4,3.3-10.2-3-18-8c-0.4-0.3-0.8-0.5-1.2-0.7c-0.3-0.2-0.7-0.4-1-0.5  c-0.2-0.1-0.3-0.2-0.5-0.3c-0.2-0.1-1.2-0.6-1.5-0.7c-0.4-0.2-0.8-0.4-1.3-0.5c-8.6-3.4-15.4-2-17-9.9C8.8,68,13.3,60.6,19.6,58.3  L19.6,58.3z"></path>	<path d="M32.5,15.6c-2.9,5.8-0.9,13.1,1,17.8c1.1,2.8,4.1,4.3,7,3.5c4.8-1.3,11.9-4.2,14.8-9.9c4.6-9.2,3.2-19.2-3.1-22.3  C45.8,1.5,37,6.4,32.5,15.6L32.5,15.6z"></path>	<path d="M85.5,42.7c-3,5.7-10.1,8.4-15,9.6c-2.9,0.7-5.9-0.8-7-3.7C61.8,43.9,60,36.5,63,30.8c4.8-9.1,13.7-13.8,19.9-10.5  C89.1,23.6,90.3,33.6,85.5,42.7z"></path>	<path d="M2.3,34.2c0.9,5.3,5.8,9.3,9.4,11.5c2.1,1.3,4.9,0.9,6.5-1.1c2.6-3.3,6-8.6,5.1-14c-1.4-8.5-7.3-14.5-13.1-13.5  C4.5,18.1,0.9,25.8,2.3,34.2z"></path>	<path d="M88,78.1c-4.8,2.4-11,0.7-14.8-0.9c-2.3-0.9-3.6-3.5-2.9-5.9c1.1-4,3.5-9.9,8.3-12.3c7.7-3.8,16-2.6,18.6,2.7  C99.8,67,95.7,74.3,88,78.1z"></path></g></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}