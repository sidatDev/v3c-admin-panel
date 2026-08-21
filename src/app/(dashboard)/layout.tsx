'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ThemeProvider, useTheme } from '@/context/theme-context';
import { ThemeCustomizer } from '@/components/theme/theme-customizer';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  Settings,
  BookOpen,
  Users,
  ShieldCheck,
  Globe,
  CreditCard,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  ChevronRight,
  Sparkles,
  BarChart3,
  Activity,
  Cpu,
  Palette,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: any;
  resource?: string;
  action?: string;
  isComingSoon?: boolean;
  subItems?: { name: string; href: string }[];
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout, checkPermission, isLoading } = useAuth();
  const { theme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kbExpanded, setKbExpanded] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  const isLightSidebar = React.useMemo(() => {
    try {
      const clean = (theme?.sidebarColor || '#FFFFFF').replace('#', '').trim();
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return (r * 299 + g * 587 + b * 114) / 1000 >= 140;
      }
      if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 >= 140;
      }
    } catch (_) {}
    return true;
  }, [theme?.sidebarColor]);

  // Group menu items based on sidebar design
  const mainNavItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, resource: 'dashboard', action: 'view' },
    { name: 'Conversations', href: '/conversations', icon: MessageSquare, resource: 'conversations', action: 'view' },
    { name: 'Leads', href: '/leads', icon: UserCheck, resource: 'leads', action: 'view' },
    { name: 'AI Agents & Retrieval', href: '/ai-agents', icon: Cpu, resource: 'ai_agents', action: 'view' },
    { 
      name: 'AI Search', 
      href: '/ai-search', 
      icon: Sparkles, 
      resource: 'ai_search', 
      action: 'view' 
    },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, resource: 'analytics', action: 'view' },
    { name: 'AI Logs & Telemetry', href: '/ai-logs', icon: Activity, resource: 'ai_logs', action: 'view' },
    { 
      name: 'Manage Widget', 
      href: '/manage-widget', 
      icon: Settings, 
      resource: 'widget', 
      action: 'view' 
    },
    {
      name: 'Knowledge Base',
      href: '/knowledge-base',
      icon: BookOpen,
      resource: 'knowledge_base',
      action: 'view',
      subItems: [
        { name: 'Overview', href: '/knowledge-base' },
        { name: 'Sitemap', href: '/knowledge-base/sitemap' },
        { name: 'Custom Knowledge', href: '/knowledge-base/custom' },
        { name: 'Documents', href: '/knowledge-base/documents' },
      ]
    },
    { 
      name: 'Team Management', 
      href: '/team-management', 
      icon: Users,
      resource: 'team',
      action: 'view'
    },
    { 
      name: 'Roles & Permissions', 
      href: '/roles-permissions', 
      icon: ShieldCheck,
      resource: 'roles',
      action: 'view'
    },
  ];

  const domainNavItems: SidebarItem[] = [
    { 
      name: 'Domain Settings', 
      href: '/domain-settings', 
      icon: Globe,
      resource: 'domain',
      action: 'view'
    },
    { name: 'Billing', href: '/billing', icon: CreditCard, resource: 'billing', action: 'view' },
  ];

  // Helper to filter sidebar items by permission
  const filterItems = (items: SidebarItem[]) => {
    return items.filter(item => {
      if (!item.resource || !item.action) return true;
      return checkPermission(item.resource, item.action);
    });
  };

  const filteredMainItems = filterItems(mainNavItems);
  const filteredDomainItems = filterItems(domainNavItems);
  const tenantSlug = user?.tenantSlug || 'v3c-system-tenant';

  // Helper to build tenant slug URLs
  const getTenantHref = (rawPath: string) => {
    if (rawPath === '#') return '#';
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return `/${tenantSlug}${cleanPath}`;
  };

  // Helper to check if a route is active
  const isRouteActive = (rawPath: string, subItems?: { name: string; href: string }[]) => {
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const tenantScoped = `/${tenantSlug}${cleanPath}`;

    if (pathname === rawPath || pathname === tenantScoped) return true;
    if (pathname.startsWith(tenantScoped + '/') || (cleanPath !== '/' && pathname.startsWith(cleanPath + '/'))) return true;

    if (subItems) {
      return subItems.some(sub => {
        const subClean = sub.href.startsWith('/') ? sub.href : `/${sub.href}`;
        const subScoped = `/${tenantSlug}${subClean}`;
        return pathname === sub.href || pathname === subScoped;
      });
    }
    return false;
  };

  // Redirect bare routes or mismatched URL slugs to user's assigned tenant slug
  React.useEffect(() => {
    if (isLoading || !user) return;
    const currentSlug = user.tenantSlug || 'v3c-system-tenant';
    const isSuperAdmin = user.role === 'super_admin';

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return;

    const firstSegment = segments[0];
    
    const RESERVED_PATHS = [
      'dashboard', 'analytics', 'conversations', 'agent-inbox', 'ai-agents', 'ai-logs',
      'leads', 'manage-widget', 'integrations', 'knowledge-base', 'ai-search',
      'team-management', 'roles-permissions', 'domain-settings', 'billing', 'account', 'notifications'
    ];

    if (RESERVED_PATHS.includes(firstSegment)) {
      const cleanPath = pathname.replace(/^\//, '');
      router.replace(`/${currentSlug}/${cleanPath}`);
    } else if (firstSegment !== currentSlug && !isSuperAdmin) {
      const pathSuffix = segments.slice(1).join('/');
      router.replace(`/${currentSlug}/${pathSuffix || 'dashboard'}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="relative flex flex-col items-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-indigo-400 animate-pulse">
            {isLoading ? 'HYDRATING USER SESSION...' : 'REDIRECTING TO LOGIN...'}
          </p>
        </div>
      </div>
    );
  }

  // Get active menu/page label for breadcrumbs
  const getBreadcrumbs = () => {
    const rawSegments = pathname.split('/').filter(Boolean);
    const segments = rawSegments[0] === tenantSlug ? rawSegments.slice(1) : rawSegments;
    return segments.map((seg, i) => {
      const href = `/${tenantSlug}/` + segments.slice(0, i + 1).join('/');
      const label = seg.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return { label, href, isLast: i === segments.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-all duration-300 lg:static lg:translate-x-0 ${
          isLightSidebar ? 'border-r border-slate-200 shadow-xs' : 'border-r border-slate-800'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: theme.sidebarColor }}
      >
        {/* LOGO AREA */}
        <div 
          className={`flex h-20 items-center justify-between px-4 border-b ${
            isLightSidebar 
              ? 'border-slate-200/80 bg-slate-50/60' 
              : 'border-white/10 bg-black/20'
          }`}
        >
          <Link href={getTenantHref('/dashboard')} className="flex items-center gap-3 py-1">
            <img src="/v3c-logo.png" alt="V3C Logo" className="h-10 w-auto object-contain transition-transform hover:scale-105" />
            <div>
              <span className={`font-bold tracking-tight text-base block leading-tight ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>
                V3C Platform
              </span>
              {user?.companyName && (
                <p className={`text-[10px] font-semibold tracking-wide truncate max-w-[130px] ${isLightSidebar ? 'text-slate-500' : 'text-slate-300'}`}>
                  {user.companyName.toUpperCase()}
                </p>
              )}
            </div>
          </Link>
          <button 
            className={`rounded-lg p-1.5 lg:hidden ${
              isLightSidebar 
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' 
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {/* Main Module Category */}
          <div className="space-y-1">
            <p className={`px-3 text-[10px] font-bold tracking-wider uppercase ${isLightSidebar ? 'text-slate-400' : 'text-slate-400/80'}`}>
              Main Operations
            </p>
            {filteredMainItems.map((item) => {
              const isActive = isRouteActive(item.href, item.subItems);
              
              if (item.subItems) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setKbExpanded(!kbExpanded)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        isActive 
                          ? isLightSidebar ? 'bg-slate-100 text-slate-900 font-semibold' : 'bg-white/10 text-white font-semibold' 
                          : isLightSidebar ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon 
                          className="h-4 w-4" 
                          style={{ color: isActive ? theme.accentColor : undefined }} 
                        />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${kbExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Collapsible Submenus */}
                    {kbExpanded && (
                      <div className={`pl-9 space-y-1 border-l ml-5 mt-1 ${isLightSidebar ? 'border-slate-200' : 'border-white/10'}`}>
                        {item.subItems.map((sub) => {
                          const subActive = isRouteActive(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={getTenantHref(sub.href)}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                subActive 
                                  ? isLightSidebar ? 'text-slate-900 bg-slate-100 font-semibold' : 'text-white bg-white/15 font-semibold' 
                                  : isLightSidebar ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                              style={subActive ? { borderLeft: `2px solid ${theme.accentColor}` } : {}}
                            >
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.isComingSoon ? '#' : getTenantHref(item.href)}
                  onClick={() => !item.isComingSoon && setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'shadow-xs font-semibold' 
                      : isLightSidebar ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  } ${item.isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: theme.sidebarActiveColor || theme.primaryColor,
                          color: theme.sidebarActiveTextColor || '#FFFFFF',
                          borderRadius: theme.borderRadius,
                          borderLeft: `3px solid ${theme.accentColor}`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon 
                      className={`h-4 w-4 ${!isActive ? (isLightSidebar ? 'text-slate-500' : 'text-slate-400') : ''}`} 
                      style={isActive ? { color: theme.sidebarActiveTextColor || '#FFFFFF' } : {}}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.isComingSoon && (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${isLightSidebar ? 'bg-slate-200 text-slate-600' : 'bg-black/40 text-slate-400'}`}>
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Domain Settings Category */}
          <div className="space-y-1">
            <p className={`px-3 text-[10px] font-bold tracking-wider uppercase ${isLightSidebar ? 'text-slate-400' : 'text-slate-400/80'}`}>
              Branding & Keys
            </p>
            {filteredDomainItems.map((item) => {
              const isActive = isRouteActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.isComingSoon ? '#' : getTenantHref(item.href)}
                  onClick={() => !item.isComingSoon && setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'shadow-xs font-semibold' 
                      : isLightSidebar ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  } ${item.isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: theme.sidebarActiveColor || theme.primaryColor,
                          color: theme.sidebarActiveTextColor || '#FFFFFF',
                          borderRadius: theme.borderRadius,
                          borderLeft: `3px solid ${theme.accentColor}`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon 
                      className={`h-4 w-4 ${!isActive ? (isLightSidebar ? 'text-slate-500' : 'text-slate-400') : ''}`} 
                      style={isActive ? { color: theme.sidebarActiveTextColor || '#FFFFFF' } : {}}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.isComingSoon && (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${isLightSidebar ? 'bg-slate-200 text-slate-600' : 'bg-black/40 text-slate-400'}`}>
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* BOTTOM USER PANEL */}
        <div className={`relative border-t p-4 ${isLightSidebar ? 'border-slate-200' : 'border-white/10'}`}>
          <div 
            className={`flex items-center justify-between rounded-lg p-2 border ${
              isLightSidebar 
                ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/80' 
                : 'bg-black/20 border-white/5'
            }`}
          >
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex flex-1 items-center gap-3 text-left outline-none cursor-pointer"
            >
              <div 
                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold border uppercase ${
                  isLightSidebar 
                    ? 'bg-slate-200 text-slate-800 border-slate-300' 
                    : 'bg-slate-800 text-white border-slate-700'
                }`}
              >
                {user?.image ? (
                  <img src={user.image} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  user?.name ? user.name.slice(0, 2) : 'US'
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className={`text-xs font-semibold truncate ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform" />
            </button>
          </div>

          {/* USER CONTEXT MENU */}
          {profileDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
              <div 
                className={`absolute bottom-20 left-4 right-4 z-20 rounded-xl p-2 shadow-2xl animate-fade-in border ${
                  isLightSidebar 
                    ? 'border-slate-200 bg-white' 
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <Link
                  href="/account/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    isLightSidebar 
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Account Settings
                </Link>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setThemeDrawerOpen(true);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer ${
                    isLightSidebar 
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" style={{ color: theme.accentColor }} />
                  Theme Customizer
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* HEADER & CONTENT VIEWPORT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER BAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
          {/* Breadcrumbs / Mobile trigger */}
          <div className="flex items-center gap-4">
            <button 
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav className="hidden items-center gap-1.5 text-sm font-medium text-slate-500 sm:flex">
              <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
                Admin
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <Link 
                    href={crumb.href} 
                    className={crumb.isLast ? 'font-semibold text-slate-900 pointer-events-none' : 'text-slate-400 hover:text-slate-600 transition-colors'}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Action items */}
          <div className="flex items-center gap-3">
            {/* Theme Customizer Trigger */}
            <button
              onClick={() => setThemeDrawerOpen(true)}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Customize Portal Theme"
            >
              <Palette className="h-4 w-4" style={{ color: theme.accentColor }} />
              <span className="hidden md:inline text-slate-600">Theme</span>
            </button>

            {/* Notification triggers */}
            <Link 
              href="/notifications"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-95"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
              </span>
            </Link>

            {/* Role indicator label */}
            <div className="hidden border-l border-slate-200 pl-3 sm:block">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                {user?.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-8 page-enter">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Theme Customizer Slide-over Drawer */}
      {themeDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setThemeDrawerOpen(false)}
          />
          {/* Slide-over Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-[430px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <ThemeCustomizer onClose={() => setThemeDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ThemeProvider>
  );
}
