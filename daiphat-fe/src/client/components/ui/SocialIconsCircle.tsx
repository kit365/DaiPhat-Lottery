import { Facebook, Instagram } from "iconoir-react";
import { useSettingGeneral } from "../../hooks/useSettings";

export const SocialIconCircle = ({ className }: { className?: string }) => {
    const { data: general } = useSettingGeneral();

    return (
        <ul className={`flex gap-[10px] ${className}`}>
            <li
                className="w-[38px] h-[38px] bg-transparent border border-client-secondary text-client-secondary p-[10px] 
                                             rounded-full flex items-center justify-center cursor-pointer 
                                             hover:text-white hover:bg-client-primary hover:border-client-primary transition-default"
            >
                <a href={general?.instagram || "#"} target="_blank" rel="noopener noreferrer">
                    <Instagram strokeWidth={2} className="w-[16px] h-[16px]" />
                </a>
            </li>
            <li
                className="w-[38px] h-[38px] bg-transparent border border-client-secondary text-client-secondary p-[10px] 
                                                                rounded-full flex items-center justify-center cursor-pointer 
                                                                hover:text-white hover:bg-client-primary hover:border-client-primary transition-default"
            >
                <a href={general?.facebook || "#"} target="_blank" rel="noopener noreferrer">
                    <Facebook strokeWidth={2} className="w-[16px] h-[16px]" />
                </a>
            </li>
        </ul>
    )
}