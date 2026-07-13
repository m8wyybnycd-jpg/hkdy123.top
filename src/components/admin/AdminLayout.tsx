import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/**
 * Admin layout: composes the Sidebar, TopBar, and the routed
 * page content (Outlet) into a responsive shell.
 *
 * Desktop: fixed sidebar (240px) + scrollable content area.
 * Mobile: sidebar hidden by default, toggled via TopBar hamburger.
 */
export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-60">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
