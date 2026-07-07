import { Link, useLocation } from "wouter";
import { useState, useCallback } from "react";
import { LayoutDashboard, FileText, Shield, UserCog, LogOut, Bell, AlertTriangle, CheckCircle2, Target, Satellite, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import mythosLogo from "@/assets/mythos-icon-color_1771007289183.png";

interface NavDropdownItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  description: string;
}

interface NavGroup {
  groupLabel: string;
  items: NavDropdownItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Intelligence",
    items: [
      { label: "Mission View", href: "/mission-view", icon: Target, description: "Executive risk heatmaps and ROI analysis" },
      { label: "Investigations", href: "/investigations", icon: UserCog, description: "AI-assisted threat case management" },
    ],
  },
  {
    groupLabel: "Attack Surface",
    items: [
      { label: "Attack Paths", href: "/attack-paths", icon: FileText, description: "Visualize attack vectors and exploitation chains" },
      { label: "Pentest", href: "/pentest", icon: Shield, description: "Penetration testing and scan management" },
      { label: "CVE Classifier", href: "/cve-classifier", icon: Shield, description: "CVSS scoring and vulnerability classification" },
    ],
  },
  {
    groupLabel: "Infrastructure",
    items: [
      { label: "GNSS & Drone", href: "/gnss-drone", icon: Satellite, description: "GNSS threat monitoring and drone fleet security" },
      { label: "Compliance", href: "/compliance", icon: ClipboardCheck, description: "Framework coverage and regulatory compliance" },
    ],
  },
];

const notifications = [
  { icon: "alert", message: "Critical CVE detected in production", time: "2 min ago", unread: true },
  { icon: "shield", message: "Pentest scan completed successfully", time: "15 min ago", unread: true },
  { icon: "alert", message: "Unauthorized access attempt blocked", time: "1 hour ago", unread: false },
  { icon: "success", message: "Security policies updated", time: "2 hours ago", unread: false },
  { icon: "shield", message: "New threat signatures loaded", time: "3 hours ago", unread: false },
];

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "alert":
      return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    case "shield":
      return <Shield className="h-4 w-4 text-primary shrink-0" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 shrink-0" />;
  }
}

function isGroupActive(group: NavGroup, location: string): boolean {
  return group.items.some(
    (item) => location === item.href || (item.href !== "/" && location.startsWith(item.href))
  );
}

const roleBadgeColors: Record<string, string> = {
  admin: "bg-destructive/20 text-destructive",
  analyst: "bg-primary/20 text-primary",
  viewer: "bg-muted text-muted-foreground",
};

export function DashboardHeader() {
  const [location, setLocation] = useLocation();
  const [unreadCount, setUnreadCount] = useState(notifications.filter(n => n.unread).length);
  const isDashboardActive = location === "/";
  const { user, logout } = useAuth();

  const navigate = useCallback((href: string) => {
    setLocation(href);
  }, [setLocation]);

  const handleLogout = useCallback(() => {
    logout();
    setLocation("/login");
  }, [logout, setLocation]);

  const userInitials = user
    ? (user.username.substring(0, 2).toUpperCase())
    : "??";

  return (
    <header className="sticky top-0 z-50 w-full bg-card dark:bg-[rgba(2,8,25,0.95)] border-b dark:border-b-[rgba(0,230,255,0.25)] dark:shadow-[0_2px_20px_rgba(0,230,255,0.08)]" data-testid="dashboard-header">
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <img src={mythosLogo} alt="Mythos AI" className="h-8 w-8 rounded-md" />
            <span className="text-lg font-semibold tracking-tight dark:neon-text">
              Athena <span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href="/">
                    <Button
                      variant={isDashboardActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-1.5 text-xs font-medium ${isDashboardActive ? "text-primary" : ""}`}
                      data-testid="nav-dashboard"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Button>
                  </Link>
                </NavigationMenuItem>

                {navGroups.map((group) => {
                  const groupActive = isGroupActive(group, location);
                  return (
                    <NavigationMenuItem key={group.groupLabel}>
                      <NavigationMenuTrigger
                        className={cn(
                          "text-xs font-medium h-8",
                          groupActive && "text-primary bg-secondary"
                        )}
                        data-testid={`nav-group-${group.groupLabel.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {group.groupLabel}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[320px] gap-1 p-2">
                          {group.items.map((item) => {
                            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                            const Icon = item.icon;
                            return (
                              <li key={item.href}>
                                <a
                                  href={item.href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(item.href);
                                  }}
                                  className={cn(
                                    "flex items-start gap-3 rounded-md p-3 transition-colors hover-elevate cursor-pointer",
                                    isActive && "bg-secondary text-primary"
                                  )}
                                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium leading-none">{item.label}</span>
                                    <span className="text-xs text-muted-foreground leading-snug">{item.description}</span>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" data-testid="popover-notifications">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setUnreadCount(0)}
                  data-testid="button-mark-all-read"
                >
                  Mark all read
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 ${
                      n.unread && unreadCount > 0 ? "bg-muted/50" : ""
                    }`}
                    data-testid={`notification-item-${index}`}
                  >
                    <NotificationIcon type={n.icon} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8" data-testid="avatar-user">
              <AvatarFallback className="bg-primary/20 text-xs font-medium">{userInitials}</AvatarFallback>
            </Avatar>
            {user && (
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-medium leading-none" data-testid="text-username">{user.username}</span>
                <Badge
                  variant="secondary"
                  className={cn("text-[9px] px-1 py-0 mt-0.5 w-fit no-default-hover-elevate no-default-active-elevate", roleBadgeColors[user.role])}
                  data-testid="badge-role"
                >
                  {user.role}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
