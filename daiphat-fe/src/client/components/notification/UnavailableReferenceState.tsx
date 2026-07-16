import { Link } from 'react-router-dom';

type UnavailableReferenceStateProps = {
    title?: string;
    message?: string;
    primaryTo?: string;
    primaryLabel?: string;
    /** Prefer over primaryTo when dismissing in-place (e.g. already on notifications page). */
    onPrimaryClick?: () => void;
    secondaryTo?: string;
    secondaryLabel?: string;
    onSecondaryClick?: () => void;
};

const DEFAULT_MESSAGE =
    'Nội dung tham chiếu không còn khả dụng hoặc đã bị xóa. Thông báo này không còn hiệu lực.';

const primaryClassName =
    'px-5 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-bold hover:bg-[#c80f11] transition-colors cursor-pointer text-center';
const secondaryClassName =
    'px-5 py-2.5 rounded-xl border border-[#E5E8EB] text-[#637381] text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors cursor-pointer text-center';

export const UnavailableReferenceState = ({
    title = 'Thông báo không còn hiệu lực',
    message = DEFAULT_MESSAGE,
    primaryTo = '/profile/notifications',
    primaryLabel = 'Về danh sách thông báo',
    onPrimaryClick,
    secondaryTo,
    secondaryLabel,
    onSecondaryClick,
}: UnavailableReferenceStateProps) => {
    return (
        <div className="flex justify-center items-center min-h-[40vh] px-4">
            <div className="w-full max-w-md bg-white rounded-[20px] border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] p-8 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F4F6F8] text-[#919EAB] flex items-center justify-center text-2xl">
                    <i className="fa-regular fa-bell-slash"></i>
                </div>
                <div>
                    <h2 className="text-[18px] font-bold text-[#212B36]">{title}</h2>
                    <p className="text-[14px] text-[#637381] mt-2 leading-relaxed">{message}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto mt-1">
                    {onPrimaryClick ? (
                        <button type="button" onClick={onPrimaryClick} className={primaryClassName}>
                            {primaryLabel}
                        </button>
                    ) : (
                        <Link to={primaryTo} className={primaryClassName}>
                            {primaryLabel}
                        </Link>
                    )}
                    {secondaryLabel &&
                        (onSecondaryClick ? (
                            <button type="button" onClick={onSecondaryClick} className={secondaryClassName}>
                                {secondaryLabel}
                            </button>
                        ) : secondaryTo ? (
                            <Link to={secondaryTo} className={secondaryClassName}>
                                {secondaryLabel}
                            </Link>
                        ) : null)}
                </div>
            </div>
        </div>
    );
};

export const UNAVAILABLE_REFERENCE_MESSAGE = DEFAULT_MESSAGE;
