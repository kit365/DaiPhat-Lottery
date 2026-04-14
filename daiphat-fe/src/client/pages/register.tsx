import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useRegisterForm } from "../hooks/useRegisterForm";

export const Register = () => {
  const {
    form: {
      register,
      formState: { errors },
    },
    submit,
    isPending,
  } = useRegisterForm();

  return (
    <main className="h-screen overflow-hidden flex flex-col md:flex-row bg-[#f8faf8] text-[#191c1b] antialiased">
      {/* Left Side: Authentication Form */}
      <motion.section 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full md:w-1/2 h-full flex flex-col items-center justify-center px-6 md:px-10 lg:px-14 py-4 md:py-6 bg-white relative z-10"
      >
        <div className="max-w-xl w-full mx-auto scale-[0.65] origin-center">
          <div className="mb-4 text-center md:text-left">
            <span className="font-serif italic font-bold text-[#154212] text-2xl tracking-tight">The Emerald Sovereign</span>
          </div>
          <header className="mb-5">
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#191c1b] tracking-tight mb-2">Get Started Now</h1>
            <p className="text-[#42493e] text-sm lg:text-base leading-relaxed">Enter your credentials to join the most exclusive digital lottery institution.</p>
          </header>
          <form className="space-y-3" onSubmit={submit} noValidate>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Johnathan Sterling"
                disabled={isPending}
                {...register("fullName")}
                className="w-full px-4 py-2.5 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="sterling@institution.com"
                disabled={isPending}
                {...register("email")}
                className="w-full px-4 py-2.5 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                {...register("password")}
                className="w-full px-4 py-2.5 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                {...register("confirmPassword")}
                className="w-full px-4 py-2.5 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>
            <button 
              disabled={isPending}
              className="w-full py-3 rounded-xl font-semibold text-base shadow-lg active:scale-95 transition-all duration-200 text-white mt-2" 
              style={{ background: 'linear-gradient(135deg, #2d5a27 0%, #154212 100%)' }}
              type="submit"
            >
              {isPending ? "Đang đăng ký..." : "Signup"}
            </button>
          </form>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#c2c9bb] opacity-30"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest bg-white px-4 text-[#72796e]">
              Or continue with
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-[0.6rem] border border-[#c2c9bb] border-opacity-20 rounded-xl hover:bg-[#f2f4f2] transition-colors duration-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
              </svg>
              <span className="text-sm font-medium">Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-[0.6rem] border border-[#c2c9bb] border-opacity-20 rounded-xl hover:bg-[#f2f4f2] transition-colors duration-200">
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-sm font-medium">Facebook</span>
            </button>
          </div>
          <p className="mt-5 text-center md:text-left text-sm text-[#42493e]">
            Already a member? <Link className="text-[#154212] font-semibold hover:underline decoration-[#735c00]/50 underline-offset-4 transition-all" to="/login">Sign In</Link>
          </p>
        </div>
      </motion.section>

      {/* Right Side: Visual Brand Identity */}
      <motion.section 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="hidden md:flex md:w-1/2 h-full p-4 lg:p-6 bg-[#eceeec]"
      >
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAg6jPNrmesVy1SV6xcV5fchslZnTP4yhrtLNrJQqOkPhrS2ME8a6v6TDm7aG2vEWWYZ7W9FkBScAWi2dy3N85gGJ5d1qkVLCYT9m33KqVnjX5ItmTTI7p4noz5VJ61ulVTJ5mEgFhTKD-1-v9nSaeltGkwxuja6Yqj-mlwItWqucA1lyBlr2FAZvnjBtrKtUl8cvAJBmLZea0-Ay1BIc5_rou5Zwtwj8HVb3uCB2IucifGaE-C6w19yVoibItit1di_ZPfGs0X4A')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#154212]/80 via-transparent to-transparent">
            <div className="h-full flex flex-col justify-end p-10">
              <div className="max-w-lg">
                <h2 className="font-serif text-5xl font-bold text-white mb-6 leading-tight">Where intuition meets the absolute.</h2>
                <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-[#fed65b]"></div>
                  <p className="text-[#9dd090] text-sm tracking-wide">ESTABLISHED MMXXIV</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer for mobile */}
      <footer className="w-full py-8 px-6 bg-[#f8faf8] md:hidden border-t border-[#e6e9e7]">
        <div className="flex flex-col items-center gap-6">
          <span className="font-serif italic font-bold text-[#154212] text-lg">The Emerald Sovereign</span>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link className="text-[10px] tracking-widest uppercase text-[#72796e] hover:text-[#154212] transition-colors" to="#">Terms of Service</Link>
            <Link className="text-[10px] tracking-widest uppercase text-[#72796e] hover:text-[#154212] transition-colors" to="#">Privacy Policy</Link>
            <Link className="text-[10px] tracking-widest uppercase text-[#72796e] hover:text-[#154212] transition-colors" to="#">Responsible Gaming</Link>
          </div>
          <p className="text-[10px] tracking-widest uppercase text-[#c2c9bb] text-center">© 2024 The Emerald Sovereign Digital Institution.</p>
        </div>
      </footer>
    </main>
  );
};
