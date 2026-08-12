import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PasswordPolicy } from "@/shared/auth/types/auth.type";

interface Props {
  password?: string;
  policy: PasswordPolicy;
  isFocused: boolean;
}

export const PasswordStrengthMeter: React.FC<Props> = ({ password = "", policy, isFocused }) => {
  const { requirements, minLength, maxLength } = policy;

  const items = (requirements || []).map((req) => {
    let isMet = false;
    if (req.id === 'min_length') isMet = password.length >= (minLength || 6);
    else if (req.id === 'max_length') isMet = password.length <= (maxLength || 100) && password.length > 0;
    else isMet = req.regex ? new RegExp(req.regex).test(password) : false;

    return {
      id: req.id,
      description: req.description,
      isMet
    };
  });

  const metCount = items.filter(i => i.isMet).length;
  const totalCount = items.length;
  const isAllMet = metCount === totalCount && password.length > 0;

  // Strength calculation for the bar
  const strengthPercent = totalCount > 0 ? (metCount / totalCount) * 100 : 0;
  
  let strengthColor = "#cbd5e1"; // gray-300
  let strengthLabel = "";

  if (password.length > 0) {
    if (strengthPercent < 60) {
      strengthColor = "#ef4444"; // red-500
      strengthLabel = "Yếu";
    } else if (strengthPercent < 90) {
      strengthColor = "#f59e0b"; // amber-500
      strengthLabel = "Trung bình";
    } else if (strengthPercent < 100) {
      strengthColor = "#fbbf24"; // yellow-400
      strengthLabel = "Khá";
    } else {
      strengthColor = "#22c55e"; // green-500
      strengthLabel = "Mạnh";
    }
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Strength Bar */}
      <AnimatePresence>
        {isFocused && password && password.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 mb-3 mt-2.5"
          >
            <div className="flex-1 grid grid-cols-4 gap-1 h-1.5">
              {[1, 2, 3, 4].map((seg) => {
                const isActive = password.length > 0 && strengthPercent >= (seg * 25 - 5);
                return (
                  <motion.div
                    key={seg}
                    className="rounded-full bg-slate-100"
                    animate={{
                      backgroundColor: isActive ? strengthColor : "rgba(15, 23, 42, 0.04)",
                    }}
                    transition={{ duration: 0.2 }}
                  />
                );
              })}
            </div>
            {password.length > 0 && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-black uppercase tracking-wider text-right"
                style={{ color: strengthColor }}
              >
                {strengthLabel}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Requirements Checklist */}
      <AnimatePresence>
        {isFocused && !isAllMet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-0.5 pb-0.5 mt-2"
          >
            {items.map((item) => (
              <div key={item.id} className={`flex items-center gap-1.5 ${item.isMet ? 'opacity-100' : 'opacity-70'}`}>
                <span className={`flex items-center justify-center w-3 h-3 rounded-full ${item.isMet ? 'text-[#22c55e]' : 'text-slate-500'}`}>
                  {item.isMet ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-currentColor" />
                  )}
                </span>
                <span className={`text-[11.5px] font-bold leading-none ${item.isMet ? 'text-[#102937]' : 'text-slate-600'}`}>{item.description}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
