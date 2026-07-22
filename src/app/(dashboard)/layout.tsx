'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Inbox,
  UserCheck,
  Settings,
  Grid,
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
  FileText,
  User,
  ChevronRight,
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, checkPermission, isLoading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kbExpanded, setKbExpanded] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Group menu items based on sidebar design
  const mainNavItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Conversations', href: '/conversations', icon: MessageSquare },
    { name: 'Agent Inbox', href: '/agent-inbox', icon: Inbox, isComingSoon: true },
    { name: 'Leads', href: '/leads', icon: UserCheck, isComingSoon: true },
    { 
      name: 'Manage Widget', 
      href: '/manage-widget', 
      icon: Settings,
      resource: 'widget',
      action: 'read'
    },
    { 
      name: 'Integrations', 
      href: '/integrations', 
      icon: Grid,
      resource: 'integrations',
      action: 'read'
    },
    {
      name: 'Knowledge Base',
      href: '/knowledge-base',
      icon: BookOpen,
      resource: 'knowledge_base',
      action: 'read',
      subItems: [
        { name: 'Overview', href: '/knowledge-base' },
        { name: 'Sitemap', href: '/knowledge-base/sitemap' },
        { name: 'Custom Knowledge', href: '/knowledge-base/custom' },
        { name: 'Documents', href: '/knowledge-base/documents' },
        { name: 'System Prompt', href: '/knowledge-base/system-prompt' },
        { name: 'Business Persona', href: '/knowledge-base/persona' },
        { name: 'Search Tester', href: '/knowledge-base/search-tester' },
      ]
    },
    { 
      name: 'Team Management', 
      href: '/team-management', 
      icon: Users,
      resource: 'team',
      action: 'read'
    },
    { 
      name: 'Roles & Permissions', 
      href: '/roles-permissions', 
      icon: ShieldCheck,
      resource: 'roles',
      action: 'read'
    },
  ];

  const domainNavItems: SidebarItem[] = [
    { 
      name: 'Domain Settings', 
      href: '/domain-settings', 
      icon: Globe,
      resource: 'domain',
      action: 'read'
    },
    { name: 'Billing', href: '/billing', icon: CreditCard, isComingSoon: true },
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="relative flex flex-col items-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20" />
          <p className="mt-4 text-sm font-semibold tracking-wide text-indigo-400 animate-pulse">
            HYDRATING USER SESSION...
          </p>
        </div>
      </div>
    );
  }

  // Get active menu/page label for breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/');
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 dark-sidebar transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LOGO AREA */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30">
              V3
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">V3C Platform</span>
              {user?.companyName && (
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide truncate max-w-[150px]">
                  {user.companyName.toUpperCase()}
                </p>
              )}
            </div>
          </Link>
          <button 
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {/* Main Module Category */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Main Operations
            </p>
            {filteredMainItems.map((item) => {
              const isActive = pathname === item.href || (item.subItems && pathname.startsWith(item.href));
              
              if (item.subItems) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setKbExpanded(!kbExpanded)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-indigo-600/10 text-white' 
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${kbExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Collapsible Submenus */}
                    {kbExpanded && (
                      <div className="pl-9 space-y-1 border-l border-slate-800 ml-5 mt-1">
                        {item.subItems.map((sub) => {
                          const subActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                subActive 
                                  ? 'text-white bg-slate-800/60 font-semibold' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                              }`}
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
                  href={item.isComingSoon ? '#' : item.href}
                  onClick={() => !item.isComingSoon && setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  } ${item.isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.isComingSoon && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Domain Settings Category */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Branding & Keys
            </p>
            {filteredDomainItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.isComingSoon ? '#' : item.href}
                  onClick={() => !item.isComingSoon && setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  } ${item.isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.isComingSoon && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* BOTTOM USER PANEL */}
        <div className="relative border-t border-slate-800 p-4">
          <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-2 border border-slate-800/50">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex flex-1 items-center gap-3 text-left outline-none"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white border border-slate-700 uppercase">
                {user?.image ? (
                  <img src={user.image} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  user?.name ? user.name.slice(0, 2) : 'US'
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-900 bg-emerald-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform" />
            </button>
          </div>

          {/* USER CONTEXT MENU */}
          {profileDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
              <div className="absolute bottom-20 left-4 right-4 z-20 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl animate-fade-in">
                <Link
                  href="/account/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <User className="h-3.5 w-3.5" />
                  Account Settings
                </Link>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          {/* Breadcrumbs / Mobile trigger */}
          <div className="flex items-center gap-4">
            <button 
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
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
          <div className="flex items-center gap-4">
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
            <div className="hidden border-l border-slate-200 pl-4 sm:block">
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
    </div>
  );
}
