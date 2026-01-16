import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import Breadcrumb from "./components/Breadcrumb";

export default function AdminLayout() {
  const [open, setOpen] = useState(true);
  return (
    <div className="admin-shell">
      <AdminHeader onToggleSidebar={() => setOpen((v) => !v)} />
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <main
        className={`transition-all duration-300 pt-6 pb-10 px-4 ${open ? "ltr:pl-72 rtl:pr-72" : ""}`}
      >
        <div className="admin-panel">
          <div className="admin-panel-shell">
            <Breadcrumb />
            <Outlet context={{ sidebarOpen: open }} />
          </div>
        </div>
      </main>
    </div>
  );
}
