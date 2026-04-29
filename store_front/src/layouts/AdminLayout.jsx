import { Outlet } from "react-router-dom";
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  return (<div className="admin-layout"><AdminSidebar open={open} onClose={() => setOpen(false)} /><div className="admin-main"><AdminHeader onMenu={() => setOpen((v) => !v)} /><div className="admin-content"><Outlet /></div></div></div>);
}
