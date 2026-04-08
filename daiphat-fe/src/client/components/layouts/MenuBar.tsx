import { Building2 } from "lucide-react";
import { NavLink, useLocation, useSearchParams } from "react-router-dom";

type MenuItem = {
  label: string;
  to: string;
  img?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
};

export const MenuBar = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get("category");

  const menuItems: MenuItem[] = [
    {
      label: "Trang chủ",
      to: "/",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/Menu-img-2.png",
    },
    {
      label: "Dịch vụ",
      to: "/services",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/Menu-img-1.png",
    },

    {
      label: "Bài viết",
      to: "/blogs",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/07/Menu-img-12.png",
    },
    {
      label: "Sản phẩm",
      to: "/shop",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/07/Menu-img-11-1.png",
    },
    {
      label: "Chó cưng",
      to: "/shop?category=danh-cho-cho",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/Menu-img-4.png",
    },
    {
      label: "Mèo cưng",
      to: "/shop?category=danh-cho-meo",
      img: "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/Menu-img-5.png",
    },
  ];

  const checkIsActive = (itemTo: string) => {
    try {
      const url = new URL(itemTo, window.location.origin);
      const itemPath = url.pathname;
      const itemCategory = url.searchParams.get("category");

      if (itemPath === "/") return pathname === "/";

      if (itemPath !== pathname) return false;

      // Handle category filtering
      if (itemCategory) {
        return currentCategory === itemCategory;
      }

      // If it's the main shop link, it should only be active if NO category is selected
      if (itemPath === "/shop") {
        return !currentCategory;
      }

      return pathname.startsWith(itemPath);
    } catch (e) {
      return pathname.startsWith(itemTo);
    }
  };

  return (
    <div className="px-[30px] py-[10px] justify-between relative z-30">
      <div className="app-container">
        <ul className="flex items-center justify-between ml-[-22px] 2xl:ml-[-21px]">
          {menuItems.map((item, idx) => {
            const active = checkIsActive(item.to);
            return (
              <li
                key={idx}
                className={`p-[22px] 2xl:p-[21px] font-[500] uppercase hover:text-client-primary transition-[color] duration-300 ease-linear cursor-pointer ${active ? "text-client-primary font-bold" : "text-client-secondary"
                  }`}
              >
                <NavLink to={item.to} className="flex items-center gap-[10px]">
                  {item.icon ? (
                    <item.icon size={24} className={active ? "text-client-primary" : "text-[#f4a623]"} />
                  ) : (
                    <img
                      src={item.img}
                      alt={item.label}
                      width={25}
                      height={25}
                      loading="eager"
                      decoding="async"
                    />
                  )}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
