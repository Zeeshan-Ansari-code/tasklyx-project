"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Bell, Search, Plus, LogOut, User as UserIcon, Bot, Video } from "lucide-react";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Input from "../ui/Input";
import ThemeToggle from "../ui/ThemeToggle";
import NotificationsDropdown from "./NotificationsDropdown";
import SearchDropdown from "./SearchDropdown";
import IncomingCallModal from "../meetings/IncomingCallModal";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { pusherClient } from "@/lib/pusher";

const Navbar = ({ onMenuClick, sidebarOpen, sidebarCollapsed, sidebarWidth, isDesktop = false }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const desktopMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const searchRef = useRef(null);
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme } = useTheme();

  // Listen for incoming meeting calls
  useEffect(() => {
    if (user?.id && pusherClient) {
      const userChannel = pusherClient.subscribe(`user-${user.id}`);
      
      userChannel.bind("meeting:invited", (data) => {
        if (data.meeting) {
          setIncomingCall({
            type: "meeting",
            meetingId: data.meeting.meetingId,
            meetingTitle: data.meeting.title,
            caller: data.meeting.host,
            meeting: data.meeting,
          });
        }
      });
      
      return () => {
        try {
          pusherClient.unsubscribe(`user-${user.id}`);
        } catch (error) {
          // Ignore
        }
      };
    }
  }, [user?.id]);

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
      className={`sticky top-0 z-40 w-full border-b border-border/40 transition-all duration-500 ease-in-out ${theme === "light" ? "bg-linear-to-r from-slate-50/98 via-gray-50/98 to-neutral-50/98" : "bg-background/80"} backdrop-blur-xl supports-backdrop-filter:bg-background/80 shadow-sm`}
      style={{
        paddingLeft: isDesktop && sidebarOpen ? `${sidebarWidth}px` : "0px",
      }}
    >
      <div className="flex h-16 items-center px-2 sm:px-4 md:px-6 gap-1 sm:gap-2 md:gap-4 min-w-0 w-full">
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
        <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden shrink-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-xs sm:text-sm">T</span>
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight hidden sm:block">Tasklyx</span>
        </div>

        {/* Search - Desktop */}
        <div className="flex-1 max-w-xl hidden md:block ml-2 min-w-0">
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
          className="md:hidden shrink-0"
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
          {/* AI Assistant Button */}
          <Link href="/ai-chat" prefetch={true}>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex hover:bg-primary/10 transition-colors"
              title="AI Assistant"
            >
              <Bot className="h-4 w-4 mr-2" />
              <span className="text-primary font-medium">
                AI
              </span>
            </Button>
          </Link>
          <Link href="/ai-chat" prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden hover:bg-primary/10 hover:text-primary transition-colors"
              title="AI Assistant"
            >
              <Bot className="h-5 w-5" />
            </Button>
          </Link>

          {/* Meetings Button */}
          <Link href="/meetings" prefetch={true}>
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex hover:bg-primary/10 transition-colors"
              title="Meetings"
            >
              <Video className="h-4 w-4 mr-2" />
              <span className="text-primary font-medium">
                Meeting
              </span>
            </Button>
          </Link>
          <Link href="/meetings" prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden hover:bg-primary/10 hover:text-primary transition-colors"
              title="Meetings"
            >
              <Video className="h-5 w-5" />
            </Button>
          </Link>

          {/* Create Button */}
          <Link href="/boards?create=true" prefetch={true}>
            <Button 
              size="sm" 
              className="hidden sm:flex shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </Link>
          <Link href="/boards?create=true" prefetch={true}>
            <Button 
              size="icon" 
              className="sm:hidden hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </Link>

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
              <div className="absolute right-0 top-full mt-2 bg-card border border-border/50 rounded-xl shadow-xl z-9999 min-w-[220px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border/50">
                  <p className="font-semibold text-sm text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <div className="p-2">
                  <Link 
                    href="/settings" 
                    prefetch={true}
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent rounded-lg text-left transition-colors font-medium"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile Settings
                  </Link>
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
        <div className="flex md:hidden items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
          {/* Meeting Button (Mobile) */}
          <Link href="/meetings" prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              title="Meetings"
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          
          {/* AI Assistant Button (Mobile) */}
          <Link href="/ai-chat" prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
              title="AI Assistant"
            >
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          
          <div className="shrink-0">
            <ThemeToggle />
          </div>
          <div className="shrink-0">
            <NotificationsDropdown />
          </div>
          
          <div className="relative shrink-0" ref={mobileMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center shrink-0 p-0.5"
              aria-label="User menu"
            >
              <Avatar
                name={user?.name || "User"}
                src={user?.avatar}
                size="sm"
                className="cursor-pointer h-8 w-8 sm:h-9 sm:w-9"
              />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 bg-card border border-border/50 rounded-xl shadow-xl z-9999 min-w-[180px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 sm:p-4 border-b border-border/50">
                  <p className="font-semibold text-sm text-foreground truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email || ""}</p>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={(e) => handleLogout(e)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 rounded-lg text-left text-destructive transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Logout</span>
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

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            setIncomingCall(null);
            router.push(`/meetings/${incomingCall.meetingId}`);
          }}
          onReject={async () => {
            setIncomingCall(null);
          }}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </nav>
  );
};

export default Navbar;