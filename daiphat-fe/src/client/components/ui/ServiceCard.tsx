import { Link } from "react-router-dom";

interface ServiceCardProps {
    image: string;
    title: string;
    description: string;
    link: string;
}

export const ServiceCard = ({ image, title, description, link }: ServiceCardProps) => {
    return (
        <article className="section-2-item w-full text-center cursor-pointer relative">
            <div className="no-bottom-left-rounded rounded-t-[30px] rounded-br-[30px] overflow-hidden bg-[#fff0f0] pt-[60px] px-[60px] 2xl:px-[50px] 2xl:pt-[52px]">
                <div className="inline-flex w-[110px] aspect-square 2xl:w-[102px] bg-white justify-center items-center rounded-full">
                    <img
                        width={70}
                        height={70}
                        src={image}
                        alt={title}
                        className="2xl:w-[4.0625rem] aspect-square"
                    />
                </div>
                <h3 className="mb-[15px] mt-[15px]">
                    <Link to={link} className="text-client-secondary text-[1.5625rem] 2xl:text-[1.375rem] font-secondary line-clamp-1">
                        {title}
                    </Link>
                </h3>
                <p className="text-[#505050] font-[500] line-clamp-3">{description}</p>
            </div>
            <div className="bottom-container w-[88%] 2xl:w-[90%] h-[65px] flex">
                <div className="bottom-rounded bg-[#fff0f0] rounded-b-[30px] w-full h-full"></div>
                <div className="pink-square w-[30px] h-[30px] bg-[#fff0f0]">
                    <div className="rounded-tl-[30px] bg-[#fff] w-[60px] h-[60px]"></div>
                </div>
            </div>
            <Link to={link} aria-label={`View ${title}`}>
                <button className="button-watch-more-section-2 w-[16.8%] cursor-pointer aspect-square flex items-center justify-center bg-client-primary text-white rounded-full absolute bottom-0 right-0">
                </button>
            </Link>
        </article>
    );
};
