import AppImage from '@/components/AppImage';

export const PartnerLogos = () => {
    const partners = [
        { name: "Visa", icon: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" },
        { name: "MasterCard", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" },
        { name: "MoMo", icon: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" },
        { name: "ZaloPay", icon: "https://upload.wikimedia.org/wikipedia/vi/7/77/ZaloPay_Logo.png" },
        { name: "VNPay", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Logo_vnpay247.png" }
    ];

    return (
        <div className="mt-24 py-12 border-t border-black/5">
            <p className="text-center text-[12px] uppercase tracking-[0.2em] text-black/30 font-semibold mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Hợp tác cùng những đối tác tài chính hàng đầu
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-10 px-8 grayscale opacity-50 contrast-125">
                {partners.map(p => (
                    /* unoptimized: SVG/PNG partner logos are already lightweight vectors/small PNGs.
                       Bypasses Next.js image resize pipeline (Sharp) to avoid wasting Server RAM/CPU. */
                    <AppImage
                        key={p.name}
                        src={p.icon}
                        alt={p.name}
                        width={80}
                        height={32}
                        unoptimized
                        className="h-8 w-auto object-contain"
                    />
                ))}
            </div>
        </div>
    );
};
