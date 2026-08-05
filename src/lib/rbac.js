// Client-side RBAC. Mirrors the SQL permission matrix in migration 001
// so the UI can show/hide actions without a server round-trip.
// Server-side checks always remain the source of truth.

const ROLE_PERMISSIONS = {
  member: ['recordings.submit'],
  reviewer: ['recordings.submit', 'recordings.approve', 'recordings.view_all', 'sentences.manage'],
  admin: [
    'recordings.submit',
    'recordings.approve',
    'recordings.view_all',
    'sentences.manage',
    'users.view',
    'sync.manage',
    'sync.export',
  ],
  super_admin: [
    'recordings.submit',
    'recordings.approve',
    'recordings.view_all',
    'sentences.manage',
    'users.view',
    'users.manage',
    'sync.manage',
    'sync.export',
    'audit.view',
  ],
}

export const ADMIN_ROLES = ['admin', 'super_admin']

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role)
}

export function can(user, permission) {
  if (!user) return false
  const perms = ROLE_PERMISSIONS[user.role]
  return Boolean(perms && perms.includes(permission))
}

export function hasAnyRole(user, roles) {
  if (!user) return false
  return roles.includes(user.role)
}