import StarIcon from "@mui/icons-material/Star";
import type { Product } from "../../../../types/products.type";
import { Link } from "react-router-dom";

const products: Product[] = [
    {
        id: 1,
        title: "Thẻ tên",
        price: "360.000đ",
        primaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-10-1000x1048.jpg",
        secondaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-10c-1000x1048.jpg",
        rating: 5,
        isSale: true,
        url: "/san-pham/the-ten",
    },
    {
        id: 2,
        title: "Vòng cổ",
        price: "220.000đ",
        primaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-11-1000x1048.jpg",
        secondaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-11c-1000x1048.jpg",
        rating: 4,
        isSale: false,
        url: "/san-pham/vong-co",
    },
    {
        id: 3,
        title: "Áo mưa cho chó",
        price: "150.000đ",
        primaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-12-1000x1048.jpg",
        secondaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-12c-1000x1048.jpg",
        rating: 3,
        isSale: true,
        url: "/san-pham/ao-mua-cho-cho",
    },
    {
        id: 4,
        title: "Nệm nylon",
        price: "540.000đ",
        primaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-9-1000x1048.jpg",
        secondaryImage:
            "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/product-img-9a-1000x1048.jpg",
        rating: 4,
        isSale: true,
        url: "/san-pham/nem-nylon",
    },
];

export const NewProduct = () => {
    return (
        <div className="mt-[40px] 2xl:mt-[30px] text-center">
            <h3 className="mb-[50px] font-secondary text-[30px] 2xl:text-[28px]">
                Mới trong cửa hàng
            </h3>

            <ul className="grid grid-cols-4 gap-[30px]">
                {products.map((item) => (
                    <li key={item.id} className="group">
                        <div className="border border-[#ff62624d] bg-white transition-default group-hover:border-client-primary rounded-[20px] group">
                            <Link to={item.url}>
                                <img
                                    className="p-[20%] transition-transform duration-500 group-hover:scale-110"
                                    src={item.primaryImage}
                                    alt={item.title}
                                />
                            </Link>
                        </div>

                        <div className="text-center">
                            <Link to={item.url} className="block mt-[20px] mb-[18px] text-[20px] font-secondary text-client-secondary hover:text-client-primary transition-default">
                                {item.title}
                            </Link>
                            <p className="text-client-secondary mb-[14px]">
                                {item.price.toLocaleString()}
                            </p>
                            <div className="flex items-center justify-center">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon
                                        key={i}
                                        sx={{
                                            fontSize: "23px !important",
                                            color:
                                                i < item.rating
                                                    ? "#ffbb00 !important"
                                                    : "#ccc !important",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}