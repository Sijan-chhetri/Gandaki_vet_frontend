import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./layout.css";

function MainShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
    <div className="app-shell bg-light">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay d-lg-none"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <div className="main-content-wrapper">
        <Header onMenuClick={openSidebar} />

        <main className="container-fluid px-3 px-md-4 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainShell;