import { LogOut, Menu, Moon, Search, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { useAuth } from "@/features/auth/use-auth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/store/use-theme";

type AppHeaderProps = {
  onMenuClick: () => void;
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3">
        <button
          aria-label="Mở menu"
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>

        {/* Search Bar */}
        <div
          className={cn(
            "hidden items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200 md:flex",
            searchFocused
              ? "w-72 border-primary/30 bg-background shadow-sm shadow-primary/5"
              : "w-56 border-transparent bg-muted/60",
          )}
        >
          <Search className="shrink-0 text-muted-foreground" size={15} />
          <input
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Tìm kiếm..."
            type="text"
            onBlur={() => setSearchFocused(false)}
            onFocus={() => setSearchFocused(true)}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Đổi giao diện"
          className="h-9 w-9 rounded-lg px-0"
          variant="ghost"
          onClick={toggleTheme}
        >
          <ThemeIcon size={17} />
        </Button>

        {/* Separator */}
        <div className="mx-1.5 hidden h-5 w-px bg-border sm:block" />

        {/* User pill */}
        <button
          className="hidden items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-muted sm:flex"
          type="button"
          onClick={() => navigate("/profile")}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="text-[13px] font-medium text-foreground">
            {user?.fullName}
          </div>
        </button>

        <Button
          aria-label="Hồ sơ cá nhân"
          className="h-9 w-9 rounded-lg px-0 sm:hidden"
          variant="ghost"
          onClick={() => navigate("/profile")}
        >
          <UserRound size={17} />
        </Button>

        <Button
          className="h-8 gap-1.5 rounded-lg px-3 text-xs"
          variant="ghost"
          onClick={logout}
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Đăng xuất</span>
        </Button>
      </div>
    </header>
  );
}
