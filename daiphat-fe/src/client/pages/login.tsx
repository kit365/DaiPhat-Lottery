import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLoginForm } from "../hooks/useLoginForm";

export const Login = () => {
  const {
    form: {
      register,
      formState: { errors },
    },
    submit,
    isPending,
  } = useLoginForm();

  return (
    <main className="h-screen overflow-hidden flex flex-col md:flex-row bg-[#f8faf8] text-[#191c1b] antialiased">
      <motion.section
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full md:w-1/2 h-full flex flex-col items-center justify-center px-6 md:px-12 lg:px-16 py-8 bg-white"
      >
        <div className="max-w-md w-full mx-auto scale-[0.7] origin-center">
          <div className="mb-2 text-center md:text-left">
            <span className="italic font-bold text-[#154212] text-2xl tracking-tight">The Emerald Sovereign</span>
          </div>
          <header className="mb-6">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-[#42493e] text-base lg:text-lg">Access your private digital ledger and prediction portfolio.</p>
          </header>

          <form className="space-y-4" onSubmit={submit} noValidate>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@institution.com"
                disabled={isPending}
                {...register("email")}
                className="w-full px-4 py-3 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs uppercase tracking-widest text-[#72796e] font-semibold" htmlFor="password">
                  Password
                </label>
                <button type="button" className="text-xs text-[#72796e] hover:text-[#154212] transition-colors">
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                {...register("password")}
                className="w-full px-4 py-3 rounded-xl bg-[#f2f4f2] border border-transparent focus:outline-none focus:ring-1 focus:ring-[#154212] focus:bg-white transition-all"
              />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-xl font-semibold text-base lg:text-lg shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-white mt-2 disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #2d5a27 0%, #154212 100%)" }}
            >
              {isPending ? "Đang đăng nhập..." : "Login"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center mb-5">
              <div className="flex-grow border-t border-[#e6e9e7]" />
              <span className="mx-4 text-[10px] uppercase tracking-[0.2em] text-[#72796e] font-medium">Authorized Sign-in</span>
              <div className="flex-grow border-t border-[#e6e9e7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#eceeec] border border-[#c2c9bb]/15 hover:bg-[#e6e9e7] transition-colors text-sm font-medium">
                Google
              </button>
              <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#eceeec] border border-[#c2c9bb]/15 hover:bg-[#e6e9e7] transition-colors text-sm font-medium">
                Apple
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-[#42493e]">
            Don't have an account?{" "}
            <Link className="text-[#154212] font-semibold hover:underline underline-offset-4" to="/register">
              Sign up
            </Link>
          </p>

          <footer className="mt-6">
            <div className="flex flex-wrap gap-4 justify-center text-[10px] tracking-widest uppercase text-[#72796e]">
              <span>Responsible Gaming</span>
              <span>Security</span>
              <span>Privacy</span>
            </div>
          </footer>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
        className="hidden md:block md:w-1/2 h-full p-4 lg:p-6 bg-[#eceeec]"
      >
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] shadow-2xl">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFhdu5UnL6yFhhsXZIWw80EJgnEXDhJaE_ypEs1NGBDymaxLk3r28y4o6WcFqSy8SAvlDXM4qumEMmZdyQXCHFINNZnBe9kmWixSTl-UNVTggxMOC2dntZU2nlaKLhiyR_IVlZU_7-S8AY3Cen0CXIXrEKabsCuzInrmi9Y_4ikfSo5noL_4OUunserWUmYV-STNYVyRlv5cmB-GkezoduKktsR-8j3r7rb-5hhvwcs3FNVLJleOxfnoNWYih8UrW0VgevKQpWng"
            alt="Premium lottery ticket"
            className="absolute inset-0 w-full h-full object-cover"
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
    </main>
  );
};
