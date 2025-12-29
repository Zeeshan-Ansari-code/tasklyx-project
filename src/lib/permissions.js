/**
 * Role-based permissions utility
 * Defines what each role can do in the system
 */

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  TEAM_MEMBER: "team_member",
  VIEWER: "viewer",
};

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.TEAM_MEMBER]: 2,
  [ROLES.VIEWER]: 1,
};

/**
 * Check if user has a specific role
 */
export function hasRole(user, role) {
  return user?.role === role;
}

/**
 * Check if user has at least a specific role level
 */
export function hasMinimumRole(user, minRole) {
  const userLevel = ROLE_HIERARCHY[user?.role] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  return userLevel >= minLevel;
}

/**
 * Check if user is admin
 */
export function isAdmin(user) {
  return hasRole(user, ROLES.ADMIN);
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(user) {
  return hasMinimumRole(user, ROLES.MANAGER);
}

/**
 * Check if user can assign tasks to others
 */
export function canAssignTasks(user) {
  // Admin, Manager, and Team Members can assign tasks
  return hasMinimumRole(user, ROLES.TEAM_MEMBER);
}

/**
 * Check if user can assign tasks to a specific user
 */
export function canAssignTaskTo(user, targetUser) {
  if (!user || !targetUser) return false;

  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const targetLevel = ROLE_HIERARCHY[targetUser.role] || 0;

  // Admins can assign to anyone
  if (isAdmin(user)) return true;

  // Managers can assign to team members and viewers
  if (hasRole(user, ROLES.MANAGER)) {
    return targetLevel <= ROLE_HIERARCHY[ROLES.TEAM_MEMBER];
  }

  // Team members can only assign to viewers
  if (hasRole(user, ROLES.TEAM_MEMBER)) {
    return targetLevel === ROLE_HIERARCHY[ROLES.VIEWER];
  }

  return false;
}

/**
 * Check if user can create boards
 */
export function canCreateBoards(user) {
  return hasMinimumRole(user, ROLES.MANAGER);
}

/**
 * Check if user can edit boards
 */
export function canEditBoards(user) {
  return hasMinimumRole(user, ROLES.MANAGER);
}

/**
 * Check if user can delete boards
 */
export function canDeleteBoards(user) {
  return isAdmin(user) || hasRole(user, ROLES.MANAGER);
}

/**
 * Check if user can create tasks
 */
export function canCreateTasks(user) {
  return hasMinimumRole(user, ROLES.TEAM_MEMBER);
}

/**
 * Check if user can edit tasks
 */
export function canEditTasks(user, task) {
  // Viewers cannot edit
  if (hasRole(user, ROLES.VIEWER)) return false;

  // Admins and Managers can edit any task
  if (isManagerOrAbove(user)) return true;

  // Team members can edit tasks assigned to them or tasks they created
  if (hasRole(user, ROLES.TEAM_MEMBER)) {
    if (!task) return true; // Allow if task not loaded yet
    const userId = user.id || user._id;
    const assignees = task.assignees || [];
    const isAssigned = assignees.some(
      (a) => (a._id || a.id || a).toString() === userId.toString()
    );
    return isAssigned;
  }

  return false;
}

/**
 * Check if user can delete tasks
 */
export function canDeleteTasks(user) {
  return hasMinimumRole(user, ROLES.MANAGER);
}

/**
 * Check if user can manage users (change roles)
 */
export function canManageUsers(user) {
  return isAdmin(user);
}

/**
 * Check if user can view reports
 */
export function canViewReports(user) {
  return hasMinimumRole(user, ROLES.MANAGER);
}

/**
 * Get role display label
 */
export function getRoleLabel(role) {
  const labels = {
    [ROLES.ADMIN]: "Admin",
    [ROLES.MANAGER]: "Manager",
    [ROLES.TEAM_MEMBER]: "Team Member",
    [ROLES.VIEWER]: "Viewer",
  };
  return labels[role] || role;
}

/**
 * Get role badge color classes
 */
export function getRoleBadgeColor(role) {
  const colors = {
    [ROLES.ADMIN]: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    [ROLES.MANAGER]: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    [ROLES.TEAM_MEMBER]: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    [ROLES.VIEWER]: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  };
  return colors[role] || colors[ROLES.VIEWER];
}

