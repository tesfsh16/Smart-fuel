import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

// Shared responsive shell for the Station, Government and Distributor portals.
// - Desktop (md+): fixed sidebar always visible.
// - Mobile: a top bar with a hamburger that opens a slide-in drawer.
export default function PortalLayout({ role, links }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar role={role} links={links} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              role={role}
              links={links}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-blue-900 text-white flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-xl leading-none"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-bold">SmartFuel</span>
          <span className="text-blue-300 text-xs ml-auto uppercase tracking-wide">
            {role}
          </span>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
