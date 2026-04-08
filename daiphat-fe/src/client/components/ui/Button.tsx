import { Link } from "react-router-dom"

interface ButtonProps {
    content: string;
    background?: string;
    hoverBackground?: string;
    svgColor?: string;
    hoverSvgColor?: string;
    textColor?: string;
    hoverTextColor?: string;
    iconColor?: string;
    hoverIconColor?: string;
    url?: string;
}

export const Button = ({ content, background = "bg-white", hoverBackground, svgColor = "text-white", hoverSvgColor, textColor = "text-white", hoverTextColor, iconColor = "before:bg-white after:bg-white", hoverIconColor, url = "/" }: ButtonProps) => {
    return (
        <div className="relative inline-block min-w-[135px] group outside-button">
            <Link
                to={url}
                className={`button-text ${background} ${hoverBackground} ${textColor} ${hoverTextColor} ${iconColor} ${hoverIconColor} hover:animate-jumpeffect hover:[box-shadow:0_0_30px_#ffffff33] inline-block relative mask-[url('/mask-bg-button.svg')] mask-no-repeat mask-center mask-[size:100%] rounded-[10px] px-[30px] py-[12px] text-[16px] font-secondary transition-all duration-300 linear`}
            >
                {content}
            </Link>
            <svg fill="currentColor" className={`w-[10px] h-[10px] ${svgColor} ${hoverSvgColor} absolute right-[-7%] top-[-20%]`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 20" xmlSpace="preserve">
                <path d="M6.3,19.9c-0.2-0.1-0.6-0.3-0.8-0.6c-0.2-0.5,0.1-0.8,0.6-0.9c1.2-0.4,2.4-0.7,3.6-1c2.2-0.6,4.4-1.2,6.6-1.8 c0.2-0.1,0.5-0.2,0.7-0.1c0.6,0.2,1,0.7,0.5,1.3c-0.2,0.2-0.5,0.3-0.8,0.4c-1.3,0.4-2.7,0.8-4,1.2C10.4,18.8,8.5,19.2,6.3,19.9 L6.3,19.9z"></path>
                <path d="M1.2,11.3c-0.5-0.6-0.8-0.8-0.4-1.7c0.9-3,2.2-5.9,3.6-8.7C4.9,0,5.3-0.3,5.7,0c0.5,0.2,0.5,0.8,0.1,1.7 c-1.4,2.7-2.6,5.5-3.5,8.5C2.2,10.6,2,11.1,1.2,11.3L1.2,11.3z"></path>
                <path d="M5.9,13.8c-0.7,0.1-1.2-0.4-0.9-1c0.2-0.4,0.5-0.8,0.8-1.1c2.1-2,4.3-4,6.3-6.1c0.4-0.4,0.8-0.5,1.2-0.1 c0.8,0.9-0.8,1.9-1.3,2.5C10,9.9,8.1,12,5.9,13.8L5.9,13.8z"></path>
            </svg>
        </div>
    )
}