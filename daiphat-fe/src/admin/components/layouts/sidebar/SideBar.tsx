import { Link } from "react-router-dom";
import { LogoAdmin } from "../../../../assets/admin/logo";
import { NavGroup } from "./NavGroup";
import { menuManagementData, menuOverviewData } from "../../../constants/sideBar";
import { IconButton } from "@mui/material";
import { ArrowIcon } from "../../../assets/icons";
import { useSidebar } from "../../../context/sidebar/useSidebar";
import { useAuthStore } from "../../../../stores/useAuthStore";

export const SideBar = () => {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuthStore();


    return (
        <div className={`flex fixed top-0 left-0 flex-col z-[1200] h-full bg-white border-r border-[#919eab1f] transition-[width] duration-[120ms] ease-linear ${isOpen ? 'w-[300px]' : 'w-[88px]'}`}>
            {/* Icon In Out */}
            <IconButton
                onClick={toggleSidebar}
                sx={{
                    position: "fixed",
                    top: "36px",
                    left: isOpen ? "300px" : "88px",
                    transform: 'translate(-50%, -50%)',
                    p: "4px",
                    color: "#637381",
                    bgcolor: "#fff",
                    zIndex: "9999",
                    border: "1px solid #919eab1f",
                    transition: "left 120ms ease-linear",
                    pointerEvents: "auto",
                }}>
                <ArrowIcon sx={{ fontSize: "0.625rem", rotate: isOpen ? "90deg" : "270deg" }} />
            </IconButton>

            {/* Logo */}
            <div className={isOpen
                ? "pl-[28px] pt-[20px] pb-[8px]"
                : "py-[20px] flex justify-center"
            }>
                <Link to="/" className="inline-block w-[40px] h-[40px]">
                    <LogoAdmin />
                </Link>
            </div>

            <div className={`flex-1 flex flex-col relative min-h-0 ${isOpen ? '' : "px-[4px] pb-[16px] overflow-hidden"}`}>
                <div className="absolute inset-0 h-full overflow-y-auto sidebar-scroll">
                    <nav className={`text-[#637381] ${isOpen ? 'px-[16px]' : 'px-[4px]'}`}>
                        <ul>
                            <NavGroup title={"admin.overview"} data={menuOverviewData} />
                            <NavGroup title={"admin.management"} data={menuManagementData} />
                        </ul>
                    </nav>
                </div>
            </div>

        </div>
    );
};
