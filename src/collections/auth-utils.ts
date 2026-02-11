import { Access, Field, FieldAccess, SelectFieldManyValidation, TypedUser } from 'payload'

interface RoleDef {
  value: string
  label: string
  implies?: string[]
}
export const availableRoles = [
  {
    value: 'admin',
    label: 'Administrator',
    implies: ['editor'],
  },
  {
    value: 'editor',
    label: 'Editor',
    implies: ['viewer'],
  },
  {
    value: 'viewer',
    label: 'Viewer',
  },
  {
    value: 'sessionsViewer',
    label: 'Viewer (sessions only)',
  },
] as const satisfies Readonly<RoleDef[]>
const availableRoleMap = Object.fromEntries(
  availableRoles.map((role) => [role.value, role]),
) as Record<string, RoleDef>

export type Role = (typeof availableRoles)[number]['value']

/**
 * Checks that all "implies" relations are upheld
 */
export const validateRoles: SelectFieldManyValidation = (roles_) => {
  const roles = roles_ as Role[]
  const roleValues = new Set(roles)
  for (const role of roles) {
    const def = availableRoleMap[role]
    for (const other of (def.implies ?? []) as Role[]) {
      if (!roleValues.has(other)) {
        return `Role "${def.label}" requires "${availableRoleMap[other].label}" to be set`
      }
    }
  }
  return true
}

export const RolesField: Field = {
  name: 'roles',
  type: 'select',
  hasMany: true,
  required: true,
  saveToJWT: true,
  options: [...availableRoles],
  validate: validateRoles,
  // FIXME: un-comment after initial admins are granted
  // access: {
  //   create: isAdmin,
  //   update: isAdmin,
  //   read: anyone,
  // },
}

/**
 * Allows anyone to access, **including non-logged-in users!**
 *
 * Note that it is fine to use this access level for fields within a collection
 * that already has RBAC to access. E.g., you must be logged in to view the
 * Users collection, so setting a field within Users to allow "anyone" will
 * still restrict access to users who can see the collection in the first place.
 */
export const anyone = () => true

export const nobody = () => false

const isRevoked = (user: TypedUser): boolean =>
  user.collection === 'service-accounts' && user.revoked

/**
 * Allows any logged-in user to access
 */
export const loggedIn: Access & FieldAccess = ({ req: { user } }) =>
  Boolean(user) && !isRevoked(user)

/**
 * Allows access to users which have all of the given roles
 */
export function hasAllRoles(...roles: Role[]): Access & FieldAccess {
  return ({ req: { user } }) => {
    if (!user || isRevoked(user)) return false
    const set = new Set(user.roles)
    return roles.every((role) => set.has(role))
  }
}

/**
 * Allows access to users which have any of the given roles
 */
export function hasAnyRoles(...roles: Role[]): Access & FieldAccess {
  return ({ req: { user } }) => {
    if (!user || isRevoked(user)) return false
    const set = new Set(user.roles)
    return roles.some((role) => set.has(role))
  }
}

/**
 * Allows access only to administrators
 */
export const isAdmin = hasAllRoles('admin')

/**
 * Allows access only to editors
 */
export const isEditor = hasAllRoles('editor')

/**
 * Allows access only to viewers
 */
export const isViewer = hasAllRoles('viewer')

/**
 * Allows access to administrators or to the user's own entry.
 * **Must only be used on the Users collection!**
 */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user) {
    if (isRevoked(user)) return false
    if (user.roles?.includes('admin')) return true
    return {
      id: { equals: user.id },
    }
  }
  return false
}

/**
 * Tries each access test sequentially, returning true as soon as any returns
 * true. If none returns true, the last one's result is used.
 *
 * Note that if an access test other than the last returns a query, it will be
 * ignored, as it is not true.
 */
export function accessTrySequential(first: Access, ...rest: Access[]): Access {
  const tests = [first, ...rest]
  return (args) => {
    let result
    for (const test of tests) {
      result = test(args)
      if (result === true) return true
    }
    return result
  }
}
