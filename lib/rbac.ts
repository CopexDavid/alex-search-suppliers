// Система ролевого доступа (RBAC)
import { Role } from '@prisma/client'
import { AuthUser } from './auth'

// Определение прав доступа для каждой роли
export const permissions = {
  // Администратор - полный доступ ко всему
  [Role.ADMIN]: [
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'requests.create',
    'requests.read',
    'requests.update',
    'requests.delete',
    'requests.approve',
    'suppliers.create',
    'suppliers.read',
    'suppliers.update',
    'suppliers.delete',
    'quotes.read',
    'quotes.update',
    'quotes.delete',
    'settings.update',
    'reports.read',
    'reports.export',
    'audit.read',
  ],
  
  // Закупщик - может создавать заявки, искать поставщиков, отправлять запросы
  [Role.PURCHASER]: [
    'requests.create',
    'requests.read',
    'requests.update',
    'suppliers.create',
    'suppliers.read',
    'suppliers.update',
    'quotes.read',
    'quotes.update',
    'reports.read',
  ],
  
  // Руководитель - может просматривать и утверждать заявки
  [Role.MANAGER]: [
    'requests.read',
    'requests.approve',
    'suppliers.read',
    'quotes.read',
    'reports.read',
    'reports.export',
  ],
  
  // Просмотр - только чтение
  [Role.VIEWER]: [
    'requests.read',
    'suppliers.read',
    'quotes.read',
    'reports.read',
  ],
}

/**
 * Проверяет, имеет ли пользователь указанное разрешение
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  
  const rolePermissions = permissions[user.role] || []
  return rolePermissions.includes(permission)
}

/**
 * Проверяет, имеет ли пользователь хотя бы одно из указанных разрешений
 */
export function hasAnyPermission(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false
  
  return perms.some(perm => hasPermission(user, perm))
}

/**
 * Проверяет, имеет ли пользователь все указанные разрешения
 */
export function hasAllPermissions(user: AuthUser | null, perms: string[]): boolean {
  if (!user) return false
  
  return perms.every(perm => hasPermission(user, perm))
}

/**
 * Проверяет, может ли пользователь выполнить действие над ресурсом
 * Учитывает владельца ресурса
 */
export function canAccessResource(
  user: AuthUser | null,
  permission: string,
  resourceOwnerId?: string
): boolean {
  if (!user) return false
  
  // Администратор может все
  if (user.role === Role.ADMIN) return true
  
  // Проверяем базовое разрешение
  if (!hasPermission(user, permission)) return false
  
  // Если указан владелец ресурса, проверяем совпадение
  if (resourceOwnerId && resourceOwnerId !== user.id) {
    // Руководитель может видеть ресурсы других пользователей
    if (user.role === Role.MANAGER && permission.endsWith('.read')) {
      return true
    }
    return false
  }
  
  return true
}

/**
 * Получает список доступных разделов меню для пользователя
 */
export function getAvailableMenuItems(user: AuthUser | null) {
  if (!user) return []
  
  const menuItems = [
    {
      label: 'Дашборд',
      href: '/dashboard',
      permission: null, // Доступен всем
    },
    {
      label: 'Заявки',
      href: '/requests',
      permission: 'requests.read',
    },
    {
      label: 'Поставщики',
      href: '/suppliers',
      permission: 'suppliers.read',
    },
    {
      label: 'Чаты',
      href: '/chats',
      permission: 'requests.read',
    },
    {
      label: 'Поиск',
      href: '/search-process',
      permission: 'requests.create',
    },
    {
      label: 'AI Анализ',
      href: '/ai-analysis',
      permission: 'quotes.read',
    },
    {
      label: 'Аудит',
      href: '/audit',
      permission: 'audit.read',
    },
    {
      label: 'Настройки',
      href: '/settings',
      permission: 'settings.update',
    },
  ]
  
  return menuItems.filter(item => 
    !item.permission || hasPermission(user, item.permission)
  )
}

/**
 * Маппинг ролей на человекочитаемые названия
 */
export const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Администратор',
  [Role.PURCHASER]: 'Закупщик',
  [Role.MANAGER]: 'Руководитель',
  [Role.VIEWER]: 'Просмотр',
}

/**
 * Получает название роли на русском
 */
export function getRoleLabel(role: Role): string {
  return roleLabels[role] || role
}

