import { motion } from "framer-motion";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "circle" | "rectangle" | "rounded";
  className?: string;
}

export const Skeleton = ({
  width,
  height,
  variant = "rounded",
  className = "",
}: SkeletonProps) => {
  const borderRadius = 
    variant === "circle" ? "50%" : 
    variant === "rounded" ? "0.75rem" : "0.25rem";

  return (
    <motion.div
      className={`relative overflow-hidden bg-slate-200/60 dark:bg-slate-700/40 ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius,
      }}
      initial={{ opacity: 0.5 }}
      animate={{ 
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      {/* Shimmer Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ 
          duration: 1.6, 
          repeat: Infinity, 
          ease: "linear",
          delay: 0.5
        }}
      />
    </motion.div>
  );
};
