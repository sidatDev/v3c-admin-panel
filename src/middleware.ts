import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_PATHS = [
  'api',
  '_next',
  'favicon.ico',
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'dashboard',
  'analytics',
  'conversations',
  'agent-inbox',
  'ai-agents',
  'ai-logs',
  'leads',
  'manage-widget',
  'integrations',
  'knowledge-base',
  'ai-search',
  'team-management',
  'roles-permissions',
  'domain-settings',
  'billing',
  'account',
  'notifications'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return NextResponse.next();

  const firstSegment = segments[0];

  // If the first segment is not a reserved path or static asset, it is a tenant workspace slug!
  if (!RESERVED_PATHS.includes(firstSegment) && !firstSegment.includes('.')) {
    const restPath = segments.slice(1).join('/');
    const targetPath = restPath ? `/${restPath}` : '/dashboard';
    
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
