export type RoleLevel = 'L0_PLATFORM' | 'L1_GROUP' | 'L2_COMPANY' | 'L3_DEPARTMENT' | 'L4_AGENT';

export function resolveRoleLevel(user: { role?: string; roleLevel?: string | null } | null): RoleLevel {
  if (!user) return 'L4_AGENT';
  if (user.roleLevel && ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT', 'L4_AGENT'].includes(user.roleLevel)) {
    return user.roleLevel as RoleLevel;
  }
  switch (user.role) {
    case 'super_admin':
      return 'L0_PLATFORM';
    case 'group_manager':
      return 'L1_GROUP';
    case 'manager':
    case 'company_admin':
      return 'L2_COMPANY';
    case 'dept_manager':
      return 'L3_DEPARTMENT';
    case 'agent':
    case 'member':
    default:
      return 'L4_AGENT';
  }
}

/**
 * Deterministic role-level visibility mapping.
 * L0_PLATFORM, L1_GROUP, L2_COMPANY: All nav items.
 * L3_DEPARTMENT: dashboard, interested/potential leads, agent-inbox, analytics, ai-logs, departments, team.
 * L4_AGENT: dashboard, agent-inbox, interested leads.
 */
export const NAV_ITEM_PERMISSIONS: Record<string, RoleLevel[]> = {
  '/dashboard': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT', 'L4_AGENT'],
  '/conversations': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/agent-inbox': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT', 'L4_AGENT'],
  '/leads': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT', 'L4_AGENT'],
  '/ai-agents': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/ai-search': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/analytics': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT'],
  '/ai-logs': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT'],
  '/manage-widget': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/knowledge-base': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/team-management': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT'],
  '/departments': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT'],
  '/roles-permissions': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/domain-settings': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/billing': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
};

export const SUB_NAV_ITEM_PERMISSIONS: Record<string, RoleLevel[]> = {
  '/leads/interested': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT', 'L4_AGENT'],
  '/leads/potential': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY', 'L3_DEPARTMENT'],
  '/knowledge-base/sitemap': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/knowledge-base/custom': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
  '/knowledge-base/documents': ['L0_PLATFORM', 'L1_GROUP', 'L2_COMPANY'],
};

export function isNavItemVisible(
  href: string,
  roleLevel: RoleLevel,
  userPermissions: string[] = [],
  resource?: string,
  action?: string
): boolean {
  // Super admin always bypasses all checks
  if (roleLevel === 'L0_PLATFORM') return true;

  const allowedLevels = NAV_ITEM_PERMISSIONS[href];
  if (allowedLevels && !allowedLevels.includes(roleLevel)) {
    return false;
  }

  // If the user has specific fine-grained RBAC permissions loaded, enforce them;
  // otherwise, role-level visibility defaults guarantee access for seeded roles
  if (userPermissions && userPermissions.length > 0 && resource && action) {
    const required = `${resource}:${action === 'read' ? 'view' : action}`;
    return userPermissions.includes(required);
  }

  return true;
}

export function filterSubItems(
  subItems: Array<{ name: string; href: string }>,
  roleLevel: RoleLevel
): Array<{ name: string; href: string }> {
  if (roleLevel === 'L0_PLATFORM') return subItems;

  return subItems.filter(sub => {
    const allowed = SUB_NAV_ITEM_PERMISSIONS[sub.href];
    return !allowed || allowed.includes(roleLevel);
  });
}
