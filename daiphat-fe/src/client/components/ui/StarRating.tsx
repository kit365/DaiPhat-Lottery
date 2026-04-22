export const StarRating = () => (
    <div className="flex gap-1 text-[#FF801E]">
        {[...Array(5)].map((_, i) => (
            <svg key={i} width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
            </svg>
        ))}
    </div>
);
