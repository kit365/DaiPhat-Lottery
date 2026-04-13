import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useState, useRef } from "react";
import { useProductReviews } from "../../../hooks/useProductReviews";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { MediaImage, Trash } from "iconoir-react";
import { uploadImagesToCloudinary } from "../../../../admin/api/uploadCloudinary.api";
import { useAuthStore } from "../../../../stores/useAuthStore";

interface ProductCommentProps {
    productId: string;
}

export const ProductComment = ({ productId }: ProductCommentProps) => {
    const [rating, setRating] = useState<number>(5);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [comment, setComment] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const { user } = useAuthStore();
    const { reviews, isLoading, createReview, isCreating, updateReview, isUpdating } = useProductReviews(productId);

    // Check if the current user has already reviewed this product
    const hasReviewed = user && reviews?.some((review: any) => review.userId?._id === user.id || review.userId === user.id);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsImageUploading(true);
        try {
            const uploadedUrls = await uploadImagesToCloudinary(Array.from(files));
            setImages(prev => [...prev, ...uploadedUrls]);
            toast.success("Tải ảnh lên thành công!");
        } catch (error) {
            toast.error("Lỗi khi tải ảnh lên!");
        } finally {
            setIsImageUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleStartEdit = (review: any) => {
        setEditingReviewId(review._id);
        setRating(review.rating);
        setComment(review.comment);
        setImages(review.images || []);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setRating(5);
        setComment("");
        setImages([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!comment.trim()) {
            toast.error("Vui lòng nhập bình luận");
            return;
        }

        if (editingReviewId) {
            updateReview({
                id: editingReviewId,
                data: { rating, comment, images }
            }, {
                onSuccess: (data: any) => {
                    if (data.success) {
                        toast.success(data.message);
                        handleCancelEdit();
                    } else {
                        toast.error(data.message);
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Lỗi khi cập nhật đánh giá");
                }
            });
        } else {
            createReview({
                productId,
                rating,
                comment,
                images,
                orderId: "MOCK_ORDER_ID", // Mock for demo
                orderItemId: "MOCK_ITEM_ID" // Mock for demo
            }, {
                onSuccess: (data: any) => {
                    if (data.success) {
                        toast.success(data.message);
                        setComment("");
                        setRating(5);
                        setImages([]);
                    } else {
                        toast.error(data.message);
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Lỗi khi gửi đánh giá");
                }
            });
        }
    };

    if (isLoading) return <div className="app-container py-10">Đang tải đánh giá...</div>;

    return (
        <div id="reviews">
            <div className="app-container">
                <h2 className="text-[35px] 2xl:text-[28px] font-secondary text-client-secondary">Đánh giá của khách hàng ({reviews?.length || 0})</h2>
                <ul className="mb-[60px]">
                    {reviews?.map((review: any) => (
                        <li key={review._id} className="py-[30px] border-b border-[#10293726] mb-[30px] flex flex-col">
                            <div className="flex">
                                <img
                                    src={review.user?.avatar || "https://secure.gravatar.com/avatar/4b4d70c085ba692974261304da0860f360cb1f3a616203402e9e19f2d3bda5f8?s=60&d=mm&r=g"}
                                    alt=""
                                    width={60} height={60}
                                    className="w-[60px] h-[60px] rounded-[10px] border border-[#e1dde7] object-cover"
                                />
                                <div className="ml-[20px] flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center mb-[10px]">
                                                <strong className="font-secondary text-[16px] text-client-secondary">
                                                    {review.user?.fullName || "Khách hàng"}
                                                </strong>
                                                <span className="text-client-text mx-[5px]">-</span>
                                                <span className="text-client-text text-[14px]">
                                                    {format(new Date(review.createdAt), 'dd/MM/yyyy')}
                                                </span>
                                                {review.isEdited && (
                                                    <span className="text-client-text text-[12px] italic ml-[10px] opacity-70">
                                                        (Đã chỉnh sửa)
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-client-text leading-[1.8] mb-4">{review.comment}</p>

                                            {review.images && review.images.length > 0 && (
                                                <div className="flex gap-[10px] mb-2">
                                                    {review.images.map((img: string, idx: number) => (
                                                        <img key={idx} src={img} alt="" className="w-[80px] h-[80px] rounded-[10px] object-cover border border-[#e1dde7]" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end justify-between self-stretch min-w-[120px]">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <StarIcon
                                                        key={i}
                                                        sx={{
                                                            fontSize: "20px !important",
                                                            color: i < review.rating ? "#ffbb00 !important" : "#ccc !important",
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {user && (review.userId?._id === user.id || review.userId === user.id) && (
                                                <button
                                                    onClick={() => handleStartEdit(review)}
                                                    className="px-4 py-1.5 border border-client-primary text-client-primary text-[13px] font-medium rounded-full hover:bg-client-primary hover:text-white transition-all cursor-pointer whitespace-nowrap mt-4"
                                                >
                                                    Sửa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {(!reviews || reviews.length === 0) && (
                        <p className="py-10 text-center text-gray-500 italic">Chưa có đánh giá nào cho sản phẩm này.</p>
                    )}
                </ul>
            </div>

            {(!hasReviewed || editingReviewId) && (
                <form ref={formRef} onSubmit={handleSubmit} className="app-container mt-[70px] pb-[150px] 2xl:pb-[120px]">
                    <h3 className="text-[30px] 2xl:text-[24px] font-secondary text-client-secondary mb-[20px]">
                        {editingReviewId ? "Chỉnh sửa đánh giá" : "Thêm đánh giá"}
                    </h3>
                    <p className="text-client-text font-[500] mb-[20px]">Địa chỉ email của bạn sẽ không được công khai. Các trường bắt buộc được đánh dấu <span className="text-[#FF0000]">*</span></p>

                    <div className="mb-6">
                        <label className="text-client-text block font-[500] mb-[5px]">Đánh giá của bạn <span className="text-[#FF0000]">*</span></label>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => {
                                const index = i + 1;
                                const isActive = index <= (hoverRating || rating);

                                return (
                                    <div
                                        key={index}
                                        onMouseEnter={() => setHoverRating(index)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(index)}
                                        className="cursor-pointer"
                                    >
                                        {isActive ? (
                                            <StarIcon sx={{ fontSize: "28px", color: "#FF6262" }} />
                                        ) : (
                                            <StarBorderIcon sx={{ fontSize: "28px", color: "rgba(0,0,0,0.12)" }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-client-text font-[500] block mb-[5px]" htmlFor="comment">Nhận xét của bạn <span className="text-[#FF0000]">*</span></label>
                        <textarea
                            name="comment"
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Nhập nhận xét của bạn về sản phẩm..."
                            required
                            className="outline-none text-client-text h-[150px] w-full rounded-[20px] border border-[#d7d7d7] bg-white py-[16px] px-[32px]"
                        ></textarea>
                    </div>

                    {/* Image Selection & Previews */}
                    <div className="mb-6">
                        <label className="text-client-text font-[500] block mb-[10px]">Hình ảnh thực tế</label>
                        <div className="flex flex-wrap gap-[15px]">
                            {images.map((img, index) => (
                                <div key={index} className="relative w-[100px] h-[100px] rounded-[10px] border border-[#eee] overflow-hidden group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute top-[5px] right-[5px] bg-red-500 text-white p-[5px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <Trash className="w-[14px] h-[14px]" />
                                    </button>
                                </div>
                            ))}

                            {images.length < 5 && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-[100px] h-[100px] border-[2px] border-dashed border-[#ddd] rounded-[10px] flex flex-col items-center justify-center text-[#999] cursor-pointer hover:border-client-primary hover:text-client-primary transition-all bg-gray-50"
                                >
                                    {isImageUploading ? (
                                        <div className="w-6 h-6 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <MediaImage className="w-[28px] h-[28px]" strokeWidth={1.5} />
                                            <span className="text-[12px] mt-1">Thêm ảnh</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                hidden
                                accept="image/*"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating || isImageUploading}
                            className={`min-w-[150px] cursor-pointer bg-client-primary hover:bg-client-secondary transition-default text-white font-secondary px-[40px] py-[16px] rounded-[50px] ${isCreating || isUpdating || isImageUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {editingReviewId ? (isUpdating ? "Đang lưu..." : "Lưu thay đổi") : (isCreating ? "Đang gửi..." : "Gửi đánh giá")}
                        </button>
                        {editingReviewId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="min-w-[150px] cursor-pointer bg-gray-200 hover:bg-gray-300 transition-default text-client-secondary font-secondary px-[40px] py-[16px] rounded-[50px]"
                            >
                                Hủy
                            </button>
                        )}
                    </div>
                </form>
            )}

        </div>
    );
};
