import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router-dom";

import loginBg from "@/assets/login-bg.png";
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
    return <Navigate replace to={(location.state as { from?: string } | null)?.from ?? "/"} />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img alt="Ảnh nền" className="h-full w-full object-cover" src={loginBg} />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Login Card */}
      <section className="glass-card z-10 w-full max-w-[440px] overflow-hidden rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Dela <span className="text-primary">Embroidery</span>
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Hệ thống quản lý nhân sự
            </p>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="space-y-4">
            <AppInput
              autoCapitalize="characters"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-primary focus:ring-primary/20"
              error={form.formState.errors.loginCode}
              label="Mã đăng nhập"
              labelClassName="text-white/80"
              name="loginCode"
              placeholder="DLE001"
              register={form.register}
              type="text"
            />
            <AppInput
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-primary focus:ring-primary/20"
              error={form.formState.errors.password}
              label="Mật khẩu"
              labelClassName="text-white/80"
              name="password"
              placeholder="••••••••"
              register={form.register}
              type="password"
            />
          </div>

          <div className="pt-2">
            <Button
              className="h-12 w-full rounded-xl text-base font-semibold shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? "Đang xác thực..." : "Đăng nhập"}
            </Button>
          </div>

          <p className="text-center text-xs text-white/40">
            &copy; {new Date().getFullYear()} Dela Embroidery Enterprise. Đã đăng ký bản quyền.
          </p>
        </form>
      </section>
    </main>
  );
}
