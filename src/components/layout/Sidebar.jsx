"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Settings,
  Plus,
  ChevronLeft,
  X,
  FolderKanban,
  Calendar,
  BarChart3,
  UserCog,
  Shield,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "../ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { isAdmin } from "@/lib/permissions";

const Sidebar = ({ isOpen, onClose, collapsed: externalCollapsed, onCollapseChange }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [recentBoards, setRecentBoards] = useState([]);
  
  // Use external collapsed state if provided, otherwise use internal
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  // Check if user is admin
  const userIsAdmin = isAdmin(user);
  
  useEffect(() => {
    if (user?.id) {
      fetchRecentBoards();
    }
  }, [user]);

  const fetchRecentBoards = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/boards?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        // Get last 3 boards
        setRecentBoards((data.boards || []).slice(0, 3));
      }
    } catch (error) {
      // Silently fail - recent boards are non-critical
    }
  };
  
  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  const handleCreateBoard = () => {
    router.push("/boards");
    // The boards page will handle opening the create modal
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "AI Assistant",
      icon: Bot,
      href: "/ai-chat",
    },
    {
      title: "Boards",
      icon: Kanban,
      href: "/boards",
    },
    {
      title: "Projects",
      icon: FolderKanban,
      href: "/projects",
    },
    {
      title: "Calendar",
      icon: Calendar,
      href: "/calendar",
    },
    {
      title: "Team",
      icon: Users,
      href: "/team",
    },
    {
      title: "Reports",
      icon: BarChart3,
      href: "/reports",
    },
    {
      title: "Resources",
      icon: UserCog,
      href: "/resource",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ];

  // Add admin menu item if user is admin
  if (userIsAdmin) {
    menuItems.push({
      title: "User Management",
      icon: Shield,
      href: "/admin/users",
    });
  }


  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          `fixed top-0 left-0 z-50 h-screen transition-all duration-500 ease-in-out ${theme === "light" ? "bg-linear-to-b from-sky-50/98 via-blue-50/98 to-indigo-50/98" : "bg-card"} backdrop-blur-xl border-r border-border/50 shadow-lg`,
          collapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/50">
            {!collapsed && (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                  <span className="text-primary-foreground font-bold text-lg">T</span>
                </div>
                <span className="font-bold text-lg tracking-tight">Tasklyx</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* Close button for mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden"
                title="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
              {/* Collapse button for desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCollapse}
                className="hidden lg:flex"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform",
                    collapsed && "rotate-180"
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <nav className="space-y-1.5 px-3">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        "group relative",
                        isActive
                          ? item.className || "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : item.className || "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className={cn(
                        "h-5 w-5 shrink-0 transition-transform",
                        isActive && "scale-110"
                      )} />
                      {!collapsed && (
                        <span className={cn(
                          "transition-all",
                          isActive && "font-semibold"
                        )}>
                          {item.title}
                        </span>
                      )}
                      {isActive && !collapsed && !item.className && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Recent Boards */}
            {!collapsed && (
              <div className="mt-8 px-3 border-t border-border/50 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Boards
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={handleCreateBoard}
                    title="Create new board"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {recentBoards.length === 0 ? (
                    <div className="px-3 py-3 text-center rounded-lg bg-muted/30 border border-dashed border-border/50">
                      <p className="text-xs text-muted-foreground">
                        No boards yet
                      </p>
                    </div>
                  ) : (
                    recentBoards.map((board) => (
                      <Link key={board._id} href={`/boards/${board._id}`}>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-accent/50 transition-all duration-200 hover:translate-x-1 group">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full shadow-sm",
                            board.background || "bg-blue-500"
                          )} />
                          <span className="truncate font-medium group-hover:text-foreground transition-colors">
                            {board.title}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;