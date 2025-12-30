"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import KeyboardShortcuts from "@/components/ui/KeyboardShortcuts";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle responsive sidebar behavior
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const desktop = window.innerWidth >= 1024; // lg breakpoint
      setIsDesktop(desktop);
      if (desktop) {
        // Always open sidebar on desktop
        setSidebarOpen(true);
      }
    };

    // Set initial state
    const desktop = window.innerWidth >= 1024;
    setIsDesktop(desktop);
    if (desktop) {
      setSidebarOpen(true);
    }

    // Listen for resize events
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Calculate sidebar width
  const sidebarWidth = sidebarCollapsed ? 64 : 256; // 64px = collapsed, 256px = expanded

  // Show loading or nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ease-in-out ${theme === "light" ? "bg-linear-to-br from-sky-50 via-blue-50 to-indigo-50" : "bg-background"}`}>
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        isDesktop={isDesktop}
      />
      
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main content with dynamic padding */}
      <main
        className="min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out"
        style={{
          paddingLeft: isDesktop && sidebarOpen ? `${sidebarWidth}px` : "0px",
        }}
      >
        <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}