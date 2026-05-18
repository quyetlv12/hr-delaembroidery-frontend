import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Lock, Sparkles, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router-dom";

import loginBg from "@/assets/login-bg.png";
import logo from "@/assets/logo.png";
import { Button } from "@/components/common/Button";
import { AppInput } from "@/components/form/AppInput";
import { showError, showSuccess } from "@/lib/toast";

import { login } from "./auth.service";
import { loginSchema, type LoginFormValues } from "./login.schema";
import { useAuth } from "./use-auth";

export function LoginPage() {
  const { isAuthenticated, setSession } = useAuth();
  const location = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { loginCode: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess(session) {
      setSession(session);
      showSuccess("Đăng nhập thành công");
    },
    onError() {
      showError("Đăng nhập thất bại", {
        description: "Vui lòng kiểm tra mã đăng nhập, mật khẩu rồi thử lại.",
      });
    },
  });

  if (isAuthenticated) {
    return (
      <Navigate
        replace
        to={(location.state as { from?: string } | null)?.from ?? "/"}
      />
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1a] font-sans">
      {/* ── Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-30"
          src={loginBg}
        />
        {/* dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a]/95 via-[#0a0f1a]/80 to-[#0d1525]/90" />

        {/* ambient glow — primary brand color */}
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#F05423]/8 blur-[140px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[#F05423]/5 blur-[160px]" />

        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full max-w-[1080px] items-center gap-16 px-6 py-10 lg:px-10">

        {/* ── Left branding ── */}
        <div className="hidden flex-1 lg:block">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700 fill-mode-both">
            {/* logo pill */}
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <img alt="Dela Embroidery" className="h-6 w-auto" src={logo} />
              <span className="text-sm font-semibold tracking-wide text-white/70">
                Dela Embroidery
              </span>
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-6xl">
              Quản trị nhân sự
              <br />
              <span className="bg-gradient-to-r from-[#F05423] to-[#ff8c5a] bg-clip-text text-transparent">
                thông minh
              </span>
            </h1>

            <p className="mt-6 max-w-sm text-base leading-relaxed text-slate-400">
              Nền tảng HRM toàn diện — chấm công, tính lương, quản lý hồ sơ
              nhân viên trong một hệ thống duy nhất.
            </p>

            {/* feature pills */}
            <div className="mt-10 flex flex-wrap gap-3">
              {["Chấm công tự động", "Tính lương công thức", "Phân quyền RBAC"].map(
                (feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                  >
                    <Sparkles className="text-[#F05423]" size={11} />
                    {feat}
                  </span>
                ),
              )}
            </div>

            {/* divider */}
            <div className="mt-12 h-px w-full bg-gradient-to-r from-[#F05423]/40 via-white/10 to-transparent" />
          </div>
        </div>

        {/* ── Login card ── */}
        <section
          aria-label="Đăng nhập"
          className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both delay-150"
        >
          {/* card shell */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-[1px] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <div className="rounded-[15px] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-8 py-9">

              {/* mobile logo */}
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
                  <img alt="Dela Embroidery" className="h-full w-auto" src={logo} />
                </div>
                <span className="text-lg font-bold text-white">
                  Dela <span className="text-[#F05423]">Embroidery</span>
                </span>
              </div>

              {/* heading */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Chào mừng trở lại</h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  Đăng nhập để tiếp tục vào hệ thống
                </p>
              </div>

              {/* form */}
              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              >
                <AppInput
                  autoCapitalize="characters"
                  autoComplete="username"
                  className="h-11 border-white/10 bg-white/[0.07] text-white placeholder:text-slate-500 focus:border-[#F05423]/60 focus:bg-white/[0.10] focus:ring-[#F05423]/20"
                  error={form.formState.errors.loginCode}
                  label="Mã đăng nhập"
                  labelClassName="text-slate-300 text-sm font-medium mb-1"
                  leftIcon={<User className="text-slate-500" size={16} />}
                  name="loginCode"
                  placeholder="DLE001"
                  register={form.register}
                  type="text"
                />

                <AppInput
                  autoComplete="current-password"
                  className="h-11 border-white/10 bg-white/[0.07] text-white placeholder:text-slate-500 focus:border-[#F05423]/60 focus:bg-white/[0.10] focus:ring-[#F05423]/20"
                  error={form.formState.errors.password}
                  label="Mật khẩu"
                  labelClassName="text-slate-300 text-sm font-medium mb-1"
                  leftIcon={<Lock className="text-slate-500" size={16} />}
                  name="password"
                  placeholder="••••••••"
                  register={form.register}
                  type="password"
                />

                {/* remember + forgot */}
                <div className="flex items-center justify-between pt-0.5 text-sm">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-slate-400 transition-colors hover:text-slate-300">
                    <input
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[#F05423]"
                      type="checkbox"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button
                    className="font-medium text-[#F05423]/80 transition-colors hover:text-[#F05423]"
                    type="button"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* submit */}
                <div className="pt-1">
                  <Button
                    className="group relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#F05423] to-[#e04010] text-sm font-semibold text-white shadow-lg shadow-[#F05423]/25 transition-all hover:shadow-[#F05423]/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                    disabled={mutation.isPending}
                    type="submit"
                  >
                    {/* shimmer on hover */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {mutation.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Đang xác thực...
                        </>
                      ) : (
                        <>
                          Đăng nhập
                          <ArrowRight
                            className="transition-transform group-hover:translate-x-0.5"
                            size={16}
                          />
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>

              {/* footer */}
              <div className="mt-8 border-t border-white/[0.06] pt-6 text-center">
                <p className="text-[11px] leading-relaxed text-slate-600">
                  &copy; {new Date().getFullYear()} Dela Embroidery Enterprise
                  <br />
                  Phát triển bởi đội ngũ công nghệ Dela
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
