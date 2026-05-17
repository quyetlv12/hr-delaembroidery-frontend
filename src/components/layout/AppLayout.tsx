import { useState } from "react";
import { Outlet } from "react-router-dom";

import { MobileNavDrawer } from "@/components/drawer/MobileNavDrawer";

import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden border-r border-border lg:block">
        <Sidebar />
      </div>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[16.5rem]">
        <AppHeader onMenuClick={() => setDrawerOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
