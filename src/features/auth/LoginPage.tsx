import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Lock, User } from "lucide-react";
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
    defaultValues: {
      loginCode: "",
      password: "",
    },
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 font-sans selection:bg-primary/30 selection:text-primary">
      {/* Background Image with Subtle Solid Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          alt="Ảnh nền"
          className="h-full w-full object-cover opacity-50 grayscale-[40%]"
          src={loginBg}
        />
        <div className="absolute inset-0 bg-slate-950/80" />

        {/* Decorative Elements (Solid) */}
        <div className="absolute top-[10%] left-[15%] h-72 w-72 animate-pulse rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[15%] h-96 w-96 animate-pulse rounded-full bg-primary/5 h-96 w-96 blur-[150px] delay-1000" />
      </div>

      {/* Login Container */}
      <div className="z-10 flex w-full max-w-[1000px] items-stretch justify-center gap-8 lg:justify-between">
        {/* Branding Section - Visible on larger screens */}
        <div className="hidden flex-1 flex-col justify-center lg:flex">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700">
            <h1 className="text-6xl font-extrabold tracking-tight text-white xl:text-7xl">
              Dela <br />
              <span className="text-primary">Embroidery</span>
            </h1>
            <div className="mt-8 h-1 w-24 rounded-full bg-primary/50" />
            <p className="mt-8 max-w-md text-xl leading-relaxed text-slate-300">
              Giải pháp quản trị nhân sự toàn diện dành cho doanh nghiệp thêu
              may hiện đại.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <section className="glass-card w-full max-w-[440px] border-white/10 p-1 bg-white/[0.03] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="rounded-2xl bg-slate-950/40 px-8 py-10 backdrop-blur-3xl lg:px-10">
            <div className="mb-10 text-center lg:hidden">
              <div className="mx-auto mb-6 flex h-20 w-auto items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-lg shadow-primary/10">
                <img
                  alt="Dela Embroidery"
                  className="h-full w-auto object-contain"
                  src={logo}
                />
              </div>
              <h2 className="text-3xl font-bold text-white">
                Dela <span className="text-primary">Embroidery</span>
              </h2>
            </div>

            <div className="mb-10">
              <h3 className="text-2xl font-semibold text-white">
                Chào mừng trở lại!
              </h3>
              <p className="mt-2 text-slate-400">
                Vui lòng đăng nhập để tiếp tục
              </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <div className="space-y-4">
                <AppInput
                  autoCapitalize="characters"
                  className="h-13 border-white/10 bg-white text-slate-950 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/20"
                  error={form.formState.errors.loginCode}
                  label="Mã đăng nhập"
                  labelClassName="text-slate-300 font-medium mb-1.5"
                  leftIcon={<User className="text-slate-400" size={18} />}
                  name="loginCode"
                  placeholder="DLE001"
                  register={form.register}
                  type="text"
                />

                <AppInput
                  className="h-13 border-white/10 bg-white text-slate-950 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/20"
                  error={form.formState.errors.password}
                  label="Mật khẩu"
                  labelClassName="text-slate-300 font-medium mb-1.5"
                  leftIcon={<Lock className="text-slate-400" size={18} />}
                  name="password"
                  placeholder="••••••••"
                  register={form.register}
                  type="password"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors">
                  <input
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                    type="checkbox"
                  />
                  Ghi nhớ đăng nhập
                </label>
                <button
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                  type="button"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="pt-2">
                <Button
                  className="group h-13 w-full rounded-xl bg-primary text-lg font-bold text-white shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={mutation.isPending}
                  type="submit"
                >
                  <span className="flex items-center justify-center gap-2">
                    {mutation.isPending ? "Đang xác thực..." : "Đăng nhập ngay"}
                    {!mutation.isPending && (
                      <ArrowRight
                        className="transition-transform group-hover:translate-x-1"
                        size={20}
                      />
                    )}
                  </span>
                </Button>
              </div>

              <div className="mt-8 border-t border-white/5 pt-6 text-center">
                <p className="text-xs text-slate-500">
                  &copy; {new Date().getFullYear()} Dela Embroidery Enterprise.{" "}
                  <br />
                  Phát triển bởi đội ngũ công nghệ Dela.
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
