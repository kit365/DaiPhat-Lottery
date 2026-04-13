import PetsIcon from "@mui/icons-material/Pets";
import { useScrollVisibility } from "../../hooks/useScrollVisibility";


export const ScrollToTopButton = () => {
    const visible = useScrollVisibility(200);

    const scrollToTop = () => {
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }, 400);
    };

    return (
        <div
            onClick={scrollToTop}
            className={`
                fixed right-[30px] bottom-[30px]
                w-[50px] h-[50px]
                flex items-center justify-center
                rounded-full border-2 border-white
                bg-client-primary hover:bg-client-secondary
                cursor-pointer transition-all duration-500 ease-in-out
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 pointer-events-none"}
            `}
        >
            <PetsIcon sx={{ width: "25px", height: "25px", color: "white" }} />
        </div>
    );
};
