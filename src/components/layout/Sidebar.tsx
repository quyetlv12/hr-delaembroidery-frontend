import { NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

import { permissions } from "@/constants/permissions";
import { navItems } from "@/constants/navigation";
import { useAuth } from "@/features/auth/use-auth";
import { cn } from "@/lib/utils";

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  const isEmployeeSelfService =
    Boolean(user?.employeeId) &&
    !user?.permissions.includes(permissions.employeesUpdate) &&
    !user?.permissions.includes(permissions.attendanceImport);
  const visibleItems = navItems.filter((item) => {
    if (!user?.permissions.includes(item.permission)) {
      return false;
    }

    if (
      isEmployeeSelfService &&
      ["/employees", "/employees/salary-history", "/organization"].includes(
        item.path,
      )
    ) {
      return false;
    }

    return true;
  });

  return (
    <aside className="flex h-full w-[16.5rem] flex-col bg-card">
      {/* Brand */}
      <div className="flex flex-col gap-4 px-5 py-6">
        <div className="flex h-12 w-full items-center justify-start overflow-hidden rounded-lg bg-white p-2 shadow-sm ring-1 ring-border/50">
          <img
            alt="Dela Embroidery"
            className="h-full w-auto object-contain"
            src={logo}
          />
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight text-card-foreground">
            Dela Embroidery
          </div>
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Hệ thống nhân sự
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-border" />

      {/* Section Label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Menu chính
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isExactMatch = location.pathname === item.path;
          const isParentMatch =
            item.path !== "/" && location.pathname.startsWith(item.path + "/");

          // An item is active if it's an exact match,
          // or if it's a parent match and no other visible item is a better match
          const isActive =
            isExactMatch ||
            (isParentMatch &&
              !visibleItems.some(
                (other) =>
                  other.path !== item.path &&
                  location.pathname.startsWith(other.path) &&
                  other.path.length > item.path.length,
              ));

          return (
            <NavLink
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={item.path}
              to={item.path}
              onClick={onNavigate}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
                size={18}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
