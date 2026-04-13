import { Mail, Phone, MapPin, Facebook, Instagram } from 'lucide-react';
import { useSettingGeneral } from '../../hooks/useSettings';
import { ProductBanner } from '../product/sections/ProductBanner';
import { FooterSub } from '../../components/layouts/FooterSub';

export const ContactPage = () => {
    const { data: general } = useSettingGeneral();

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Liên hệ", to: "/contact" },
    ];

    return (
        <>
            <ProductBanner
                pageTitle="Liên hệ với chúng tôi"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-about-pet.jpg"
            />

            <section className="relative px-[30px] bg-white pt-[80px] pb-[100px]">
                <div className="app-container">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[80px] items-center">
                        {/* Contact Information */}
                        <div className="bg-[#FFF0F0] p-[50px] rounded-[40px] shadow-custom-card border border-[#eee]">
                            <h2 className="text-[40px] font-secondary text-client-secondary mb-[40px]">Thông tin liên hệ</h2>
                            <div className="space-y-[30px]">
                                <div className="flex items-start gap-[20px]">
                                    <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                        <MapPin className="text-client-primary w-[24px] h-[24px]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-client-secondary text-[20px] mb-[5px] font-secondary">Địa chỉ</h3>
                                        <p className="text-client-text text-[18px]">{general?.address || 'Đang tải...'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-[20px]">
                                    <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                        <Phone className="text-client-primary w-[24px] h-[24px]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-client-secondary text-[20px] mb-[5px] font-secondary">Số điện thoại</h3>
                                        <p className="text-client-text text-[18px]">{general?.phone || 'Đang tải...'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-[20px]">
                                    <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                        <Mail className="text-client-primary w-[24px] h-[24px]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-client-secondary text-[20px] mb-[5px] font-secondary">Email</h3>
                                        <p className="text-client-text text-[18px]">{general?.email || 'Đang tải...'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="mt-[50px]">
                                <h3 className="text-[22px] font-bold text-client-secondary mb-[20px] font-secondary">Theo dõi chúng tôi</h3>
                                <div className="flex gap-[15px]">
                                    <a
                                        href={general?.facebook || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-[50px] h-[50px] rounded-full bg-white border border-[#eee] flex items-center justify-center text-client-secondary hover:bg-client-primary hover:text-white hover:border-client-primary transition-all duration-300 shadow-sm"
                                    >
                                        <Facebook className="w-[16px] h-[16px]" />
                                    </a>
                                    <a
                                        href={general?.instagram || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-[50px] h-[50px] rounded-full bg-white border border-[#eee] flex items-center justify-center text-client-secondary hover:bg-client-primary hover:text-white hover:border-client-primary transition-all duration-300 shadow-sm"
                                    >
                                        <Instagram className="w-[16px] h-[16px]" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Image or Map Section */}
                        <div className="h-[550px] rounded-[40px] overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 border border-[#eee] shadow-custom-card">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.657053590403!2d105.7812622153238!3d21.046337985988897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab32dd2a10c7%3A0x12013a7951035ae5!2zNjAgSG_DoG5nIFF14buRYyBWaeG7h3QsIE5naMSpYSBEw7QsIEPhuqd1IEdp4bqleSwgSMOgIE7hu5lpLCBWaeG7h24gTmFt!5e0!3m2!1svi!2s!4v1625542618928!5m2!1svi!2s"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            <FooterSub />
        </>
    );
};
