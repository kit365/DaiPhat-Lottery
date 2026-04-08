import { SectionHeader } from "../../../components/ui/SectionHeader";
import { ServiceCard } from "../../../components/ui/ServiceCard.tsx";

const services = [
    {
        image: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/service-png-img-alt-04.png",
        title: "Đồ dùng thú cưng",
        description: "Cung cấp đầy đủ các sản phẩm chăm sóc và phụ kiện chất lượng cao cho thú cưng.",
        link: "/danh-muc-san-pham/bo-suu-tap-do-choi",
    },
    {
        image: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/service-png-img-alt-08.png",
        title: "Vui chơi",
        description: "Các hoạt động thể chất và vui chơi giúp thú cưng khỏe mạnh và năng động.",
        link: "/danh-muc-san-pham/thuc-an-cho-meo",
    },
    {
        image: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/service-png-img-alt-07.png",
        title: "Nhà thú cưng",
        description: "Cung cấp không gian sống an toàn và thoải mái nhất cho thú cưng yêu quý.",
        link: "/danh-muc-san-pham/thuc-an-cho-cho",
    },
    {
        image: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/service-png-img-alt-05.png",
        title: "Yêu thương",
        description: "Đồng hành cùng bạn trong hành trình tìm kiếm và nhận nuôi thú cưng phù hợp nhất.",
        link: "/danh-muc-san-pham/phu-kien-cham-soc",
    }
];

export const Section2 = () => {
    return (
        <>
            <section className="px-[30px] py-[150px] relative overflow-x-clip">
                <img src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/home1-dog-img.png" alt="" width={400} height={400} className="2xl:w-[250px] aspect-square absolute left-[0] top-[-15%] 2xl:top-[-10%]" />
                <img src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/home1-cat-img.png" alt="" width={200} height={300} className="2xl:w-[120px] aspect-[2/3] 2xl:left-[14%] 2xl:top-[-3%] absolute left-[17%] top-[-6.5%]" />
                <img src="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/home1-pet-food.png" alt="" width={450} height={300} className="absolute right-[-2%] top-[-3%] rotate-z-[-10deg]" />
                <div className="animation-wiggle absolute right-[2%] top-[28%]">
                    <svg className="w-[7.875rem] 2xl:w-[6.875rem] aspect-square text-[#ff626259]" fill="#ff626259" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M18.7,74.5c-1.1,3.5,2,7.5,5.6,6.2c0.2-0.1,0.4-0.2,0.6-0.3C20.3,78.6,20.8,78,18.7,74.5z"></path><path d="M74.7,46.8c-1.2-0.7-2.6-2.2-3.6-2.7c0.7,1.7,4.5,6.1,6.8,5.2C78.2,48.2,75.7,47.4,74.7,46.8z"></path><path d="M25.9,81c-1.8,0.4,0.8,1.7,2.6,1c0.3-0.2,0.6-0.4,0.9-0.6C28.2,81.4,27.1,81,25.9,81L25.9,81z"></path><path d="M80.6,49.4c-1,0.1-3.6,1-1.1,1.3C82.6,50.7,82,49,80.6,49.4z"></path><path d="M85.3,48.8c-0.5,0.5-1,1-1.6,1.4c-0.4,0.3-1.4,0.5-0.8,1.1C84.2,51.4,86.2,50.2,85.3,48.8L85.3,48.8L85.3,48.8z"></path><path d="M68.1,22.5c-1,0.2-3.2,2.1-2,2.3c0.9-0.4,2-1.2,2.4-2.1l-0.1-0.1C68.3,22.5,68.2,22.5,68.1,22.5z"></path><path d="M69.5,19.5c-1.4,0-2.1,0.6-2.6,1.9l1-0.6c1.1-0.7,2-0.9,3.2-1.3C70.6,19.5,70,19.4,69.5,19.5L69.5,19.5z"></path><path d="M67.5,26c-0.7,0.3-1.8,1.8-0.8,2.2C67.2,28,68.4,26.4,67.5,26z"></path><path d="M88.4,48.8c-0.4,0.2-1.9,1.7-0.7,1.8C88.4,50.3,89.6,48.9,88.4,48.8z"></path><path d="M68,28.7c-0.6,0.4-1.4,1.2-0.5,1.8C68.1,30.3,68.8,29,68,28.7z"></path><path d="M13.3,61.5c-1.1,0.3-1.5,1.6,0,1.4C14.4,62.4,15,61.2,13.3,61.5z"></path><path d="M16.7,62.1c-1.6,0.3-1.6,1.7-0.6,1.4c0.6-0.3,1-0.8,1.4-1.4C17.2,62.1,17,62.1,16.7,62.1L16.7,62.1z"></path><path d="M84.9,30.2c0.9-3.4,0.5-7.2-1.3-10.3c-2.4-4.1-7.5-7.3-12.5-6.6c-5.9,0.8-10.8,6.1-9.9,12.3c0.4,2.6,1.7,5-0.1,7.5  c-2.3,3.1-18.3,10-23.6,12.2c-2.7,1.2-9.7,4.7-12.6,2.5c-0.6-0.5-1.1-1.1-1.8-1.5c-5.5-3.7-13.1-3.7-17.4,1.9  c-6.1,7.8-0.3,20.5,9.5,20.8c-1.3,3.2-2.1,6.4-0.7,9.7c2.2,5.5,8.8,8.6,14.5,8.1c3.5-0.5,6.3-1.5,8.4-4.4c2.7-3.7,3.1-8.7,1.7-13  c0.4-0.9,2.2-2.5,3-3.2c6.3-5.3,13.8-9.8,21.4-12.9c1.7-0.7,4.7-1.9,6.6-2c4.3-0.1,9.4,8.9,18.5,5.2  C99.6,51.9,100.7,30.3,84.9,30.2L84.9,30.2z M85.3,53.9c-6.4,0.8-9.3-5-14.2-5.9c-3.3-0.6-7.1,1.3-10.1,2.7  c-6.7,3-18.3,9.5-23.2,15.4c0.3-2.4,0.6-2.7,1.4-4.7c-4.1,3.8-3.3,6.3-2.5,11c1.9,11.5-11.3,14.7-18.3,7  c-5.8-6.4,1.9-17.8,10.5-18.2c-0.9-0.3-1.8-0.4-2.8-0.3c-3.8,0.5-6.3,2.3-8.7,5.3c-3.7,0-6.9-1.4-9.1-4.4  C1.2,51.3,11.8,42,21.1,47.9c0.6,0.4,1.1,0.8,1.6,1.2c4.7,3.7,11.4,0.4,16.3-1.5c7.3-2.9,15.1-6.3,21.9-10.4  c7.9-4.8,2.1-11.2,3.1-15c2.1-8.1,13.4-8,17.8-0.6c1.4,2.9,1.2,7.8-0.6,10.5c-3.2,1.1-4.4,2.4-6.4,4.8c-0.3,0.7-0.7,1.3-0.9,2  c2.4-3.2,5.5-5.2,9.4-5.8C97.8,31.3,96,52.7,85.3,53.9L85.3,53.9z"></path><path d="M77.2,31.2c-0.2,1,0.9-0.1,1.1-0.4c0.5-1.1,0.2-2.9-0.3-4c-0.3-0.6-0.6-1.1-0.9-1.7c0.3,0.9,0.6,1.7,0.8,2.7  C78.3,29.5,77.5,29.9,77.2,31.2z"></path><path d="M8.6,55.2c-0.5,2.1,0.3,3.9,1.6,5.4c0.7,0.6,2.3,0.6,1.3-0.5C10.3,59.2,8.9,56.6,8.6,55.2L8.6,55.2z"></path></svg>
                </div>
                <div className="app-container text-center">
                    <SectionHeader
                        subtitle="Phục vụ nhu cầu thú cưng"
                        title="Khám phá dịch vụ cho thú cưng"
                        desc="Mang đến các dịch vụ chăm sóc, huấn luyện và vui chơi cho thú cưng một cách toàn diện. Chúng tôi luôn đồng hành để thú cưng của bạn khỏe mạnh và hạnh phúc."
                        widthDesc="w-[720px]"
                    />
                    <div className="grid grid-cols-4 gap-[30px]">
                        {services.map((service, idx) => (
                            <ServiceCard key={idx} {...service} />
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}