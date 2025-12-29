"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, Plus, LogOut, User as UserIcon } from "lucide-react";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Input from "../ui/Input";
import ThemeToggle from "../ui/ThemeToggle";
import NotificationsDropdown from "./NotificationsDropdown";
import SearchDropdown from "./SearchDropdown";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const Navbar = ({ onMenuClick, user, sidebarOpen, sidebarCollapsed, sidebarWidth, isDesktop = false }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);
  const router = useRouter();
  const { logout } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both desktop and mobile menus
      const isOutsideDesktop = desktopMenuRef.current && !desktopMenuRef.current.contains(event.target);
      const isOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(event.target);
      
      // Only close if click is outside both menus
      if (isOutsideDesktop && isOutsideMobile) {
        setShowUserMenu(false);
      }
    };

    // Use 'click' instead of 'mousedown' to ensure onClick handlers fire first
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, []);

  const handleLogout = async (e) => {
    // Prevent event from bubbling to click-outside handler
    if (e) {
      e.stopPropagation();
    }
    setShowUserMenu(false);
    try {
      await logout();
    } catch (error) {
      // Logout error handled silently
    }
  };

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/80 shadow-sm transition-all duration-300"
      style={{
        paddingLeft: isDesktop && sidebarOpen ? `${sidebarWidth}px` : "0px",
      }}
    >
      <div className="flex h-16 items-center px-6 gap-4">
        {/* Menu Button (Mobile Only) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo - Mobile Only */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Tasklyx</span>
        </div>

        {/* Search - Desktop */}
        <div className="flex-1 max-w-xl hidden md:block ml-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={searchRef}
              placeholder="Search boards, tasks..."
              className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(e.target.value.length >= 2);
              }}
              onFocus={() => {
                if (searchQuery.length >= 2) {
                  setShowSearch(true);
                }
              }}
              onBlur={(e) => {
                // Don't close if clicking on dropdown
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setTimeout(() => setShowSearch(false), 200);
                }
              }}
            />
            {showSearch && (
              <SearchDropdown
                isOpen={showSearch}
                onClose={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>

        {/* Search Icon (Mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={() => {
            setShowSearch(!showSearch);
            if (!showSearch) {
              setTimeout(() => searchRef.current?.focus(), 100);
            }
          }}
        >
          <Search className="h-5 w-5" />
        </Button>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          {/* Create Button */}
          <Button 
            size="sm" 
            className="hidden sm:flex shadow-sm hover:shadow-md transition-shadow"
            onClick={() => router.push("/boards?create=true")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
          <Button 
            size="icon" 
            className="sm:hidden hover:bg-primary/90 transition-colors"
            onClick={() => router.push("/boards?create=true")}
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Menu */}
          <div className="relative" ref={desktopMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 hover:bg-accent rounded-lg p-1 transition-colors"
            >
              <Avatar
                name={user?.name || "User"}
                src={user?.avatar}
                size="default"
                className="cursor-pointer"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-card border border-border/50 rounded-xl shadow-xl z-100 min-w-[220px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border/50">
                  <p className="font-semibold text-sm text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      router.push("/settings");
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent rounded-lg text-left transition-colors font-medium"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleLogout(e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 rounded-lg text-left text-destructive transition-colors font-medium mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Right Section */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <NotificationsDropdown />
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center"
            >
              <Avatar
                name={user?.name || "User"}
                src={user?.avatar}
                size="default"
                className="cursor-pointer"
              />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-card border border-border/50 rounded-xl shadow-xl z-100 min-w-[220px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border/50">
                  <p className="font-semibold text-sm text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={(e) => handleLogout(e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 rounded-lg text-left text-destructive transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {showSearch && (
        <div className="px-4 pb-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards, tasks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
            <SearchDropdown
              isOpen={searchQuery.length >= 2}
              onClose={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;