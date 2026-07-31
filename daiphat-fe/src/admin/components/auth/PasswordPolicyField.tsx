import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../admin/pages/authen/hooks/useAuth';
import { calculatePasswordStrength } from '../../../utils/password-evaluator.util';
import { cn } from '../../../utils/cn';

interface PremiumPasswordInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    error?: string;
    placeholder?: string;
    theme?: 'admin' | 'user';
    name?: string;
    id?: string;
}

export const PremiumPasswordInput: React.FC<PremiumPasswordInputProps> = ({
    value,
    onChange,
    label = "Password",
    error,
    placeholder = "Enter your password",
    theme = 'user',
    name,
    id
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const { passwordPolicy } = useAuth() as any;
    
    const strengthData = useMemo(() => 
        calculatePasswordStrength(value, passwordPolicy), 
    [value, passwordPolicy]);

    const isThemeAdmin = theme === 'admin';
    const accentColor = isThemeAdmin ? 'text-amber-500' : 'text-emerald-500';
    const ringColor = isThemeAdmin ? 'focus:ring-amber-500/30' : 'focus:ring-emerald-500/30';
    const borderColor = isThemeAdmin ? 'focus:border-amber-500' : 'focus:border-emerald-500';

    // Segment colors based on strength level
    const getSegmentColor = (index: number) => {
        const activeSegments = Math.ceil((strengthData.percentage / 100) * 4);
        if (index >= activeSegments) return 'bg-gray-200 dark:bg-gray-700';
        
        if (strengthData.strength === 'weak') return 'bg-red-500';
        if (strengthData.strength === 'fair' || strengthData.strength === 'good') return 'bg-amber-500';
        return isThemeAdmin ? 'bg-amber-600' : 'bg-emerald-500';
    };

    return (
        <div className="space-y-4 w-full group">
            <div className="relative">
                {label && (
                    <label 
                        htmlFor={id || name}
                        className={cn(
                            "block text-xs uppercase tracking-widest font-bold mb-2 transition-colors duration-300",
                            error ? "text-red-500" : "text-gray-500 group-focus-within:" + accentColor
                        )}
                    >
                        {label}
                    </label>
                )}
                
                <div className="relative">
                    <input
                        id={id || name}
                        name={name}
                        type={showPassword ? "text" : "password"}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={cn(
                            "w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-transparent",
                            "focus:outline-none focus:bg-white dark:focus:bg-black transition-all duration-300 shadow-sm",
                            borderColor, ringColor, "focus:ring-4",
                            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                
                {error && (
                    <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-2 font-medium"
                    >
                        {error}
                    </motion.p>
                )}
            </div>

            {/* Password Policy & Strength UI */}
            <AnimatePresence>
                {value && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4 pt-2"
                    >
                        {/* Status Message */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {strengthData.feedback}
                            </span>
                            <span className="text-xl animate-bounce-short">{strengthData.emoji}</span>
                        </div>

                        {/* Segmented Strength Bar */}
                        <div className="grid grid-cols-4 gap-2 h-1.5 px-0.5">
                            {[0, 1, 2, 3].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={false}
                                    animate={{ backgroundColor: getSegmentColor(i).replace('bg-', '') }} // simplified for demo
                                    className={cn("h-full rounded-full transition-all duration-500", getSegmentColor(i))}
                                />
                            ))}
                        </div>

                        {/* Checklist Section */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                            <h4 className="text-[10px] uppercase tracking-tighter font-black text-gray-400 mb-3 flex items-center gap-1.5">
                                <ShieldCheck size={12} /> Your password must:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                                {strengthData.requirements.map((req) => (
                                    <div key={req.id} className="flex items-center gap-2.5">
                                        <div className={cn(
                                            "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300",
                                            req.isMet ? (isThemeAdmin ? "bg-amber-500" : "bg-emerald-500") : "bg-gray-200 dark:bg-gray-800"
                                        )}>
                                            {req.isMet ? <Check size={10} className="text-white" /> : <X size={10} className="text-gray-400 dark:text-gray-600" />}
                                        </div>
                                        <span className={cn(
                                            "text-xs transition-colors duration-300",
                                            req.isMet ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400"
                                        )}>
                                            {req.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
