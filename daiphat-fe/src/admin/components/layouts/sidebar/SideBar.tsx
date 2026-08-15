"use client";

import Link from "@/admin/components/navigation/AdminLink";
import { NavGroup } from "./NavGroup";
import { menuManagementData, menuOverviewData } from "../../../constants/sideBar";
import { IconButton } from "@mui/material";
import { ArrowIcon } from "../../../assets/icons";
import { useSidebar } from "../../../context/sidebar/useSidebar";
import { ROUTES } from "../../../constants/routes";
import { SiteLogo } from "@/client/components/layout/SiteLogo";
import { useSiteBranding } from "@/client/hooks/useSiteBranding";

export const SideBar = () => {
    const { isOpen, toggleSidebar } = useSidebar();
    const { name } = useSiteBranding();

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

            <div className="flex shrink-0 overflow-hidden py-5 pl-5 pr-2">
                <Link
                    href={ROUTES.ADMIN.DASHBOARD.ROOT}
                    className="flex min-w-0 items-center gap-3 no-underline"
                >
                    <SiteLogo
                        className="h-9 w-9 shrink-0 rounded-lg"
                        imgClassName="h-full w-full object-contain bg-white"
                    />
                    {isOpen ? (
                        <span className="truncate text-[15px] font-extrabold tracking-tight text-[#ee1314]">
                            {name}
                        </span>
                    ) : null}
                </Link>
            </div>

            <div className={`flex-1 flex flex-col relative min-h-0 ${isOpen ? '' : "px-[4px] pb-[16px] overflow-hidden"}`}>
                <div className="absolute inset-0 h-full overflow-y-auto sidebar-scroll">
                    <nav className={`text-[#637381] ${isOpen ? 'px-[16px]' : 'px-[4px]'}`}>
                        <ul>
                            <NavGroup title="Tổng quan" data={menuOverviewData} />
                            <NavGroup title="Quản lý" data={menuManagementData} />
                        </ul>
                    </nav>
                </div>
            </div>

        </div>
    );
};
