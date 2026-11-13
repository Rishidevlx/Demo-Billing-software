export const MENU_CHILD_TABS_MAP = {
  quotations_list: ['tab_quotations_active', 'tab_quotations_converted', 'tab_quotations_cancelled'],
  outward_list: ['tab_bills_pending', 'tab_bills_paid', 'tab_bills_cancelled'],
  services_list: ['tab_services_quotation', 'tab_services_repair', 'tab_services_delivered', 'tab_services_cancelled'],
  inventory_main: ['tab_overview', 'tab_reorder', 'tab_scrap'],
  inventory_returns: ['tab_entry', 'tab_pending', 'tab_completed', 'tab_defective', 'tab_credit'],
  settings_system: ['tab_settings_company', 'tab_settings_taxes', 'tab_settings_bank', 'tab_settings_terms'],
  settings_configs: ['tab_config_mail', 'tab_config_cloudinary', 'tab_config_ai'],
  settings_config: ['tab_config_mail', 'tab_config_cloudinary', 'tab_config_ai']
}

export const TAB_PARENT_MENU_MAP = {
  tab_quotations_active: 'quotations_list',
  tab_quotations_converted: 'quotations_list',
  tab_quotations_cancelled: 'quotations_list',
  tab_bills_pending: 'outward_list',
  tab_bills_paid: 'outward_list',
  tab_bills_cancelled: 'outward_list',
  tab_services_quotation: 'services_list',
  tab_services_repair: 'services_list',
  tab_services_delivered: 'services_list',
  tab_services_cancelled: 'services_list',
  tab_overview: 'inventory_main',
  tab_reorder: 'inventory_main',
  tab_scrap: 'inventory_main',
  tab_entry: 'inventory_returns',
  tab_pending: 'inventory_returns',
  tab_completed: 'inventory_returns',
  tab_defective: 'inventory_returns',
  tab_credit: 'inventory_returns',
  tab_settings_company: 'settings_system',
  tab_settings_taxes: 'settings_system',
  tab_settings_bank: 'settings_system',
  tab_settings_terms: 'settings_system',
  tab_config_mail: 'settings_config',
  tab_config_cloudinary: 'settings_config',
  tab_config_ai: 'settings_config'
}

export const getUserPermissions = (customUser = null) => {
  const simchaUser = customUser || JSON.parse(sessionStorage.getItem('simcha_user') || localStorage.getItem('simcha_user') || '{}')
  const hasFullAccess = simchaUser.role === 'Administrator' || (simchaUser.admin_access || []).includes('Full Admin Access')
  
  const getPerms = (menuId) => {
    const perms = simchaUser.permissions || {}
    const p = perms[menuId]
    if (Array.isArray(p) && p.length > 0) return p
    if (menuId === 'settings_config') return perms['settings_configs'] || []
    if (menuId === 'settings_configs') return perms['settings_config'] || []
    return []
  }
  
  const checkAction = (targetId, action) => {
    if (hasFullAccess) return true
    if (targetId === 'user-manual' || targetId === 'user_manual' || targetId === 'settings_profile' || targetId === 'profile-settings') return true

    const direct = getPerms(targetId)
    if (Array.isArray(direct) && direct.includes(action)) return true

    // Check parent inheritance for child tabs
    const parentId = TAB_PARENT_MENU_MAP[targetId]
    if (parentId) {
      const siblingTabs = MENU_CHILD_TABS_MAP[parentId] || []
      const hasAnySiblingConfigured = siblingTabs.some(sibId => {
        const p = getPerms(sibId)
        return Array.isArray(p) && p.length > 0
      })

      // If NO child tabs have been individually configured, inherit from parent menu
      if (!hasAnySiblingConfigured) {
        const parentPerms = getPerms(parentId)
        return Array.isArray(parentPerms) && parentPerms.includes(action)
      }
    }

    return false
  }

  const checkAnyAction = (targetId, actions) => {
    if (hasFullAccess) return true
    if (targetId === 'user-manual' || targetId === 'user_manual' || targetId === 'settings_profile' || targetId === 'profile-settings') return true
    return actions.some(act => checkAction(targetId, act))
  }

  const checkHasPerm = (targetId) => {
    if (hasFullAccess) return true
    if (targetId === 'user-manual' || targetId === 'user_manual' || targetId === 'settings_profile' || targetId === 'profile-settings') return true
    
    const direct = getPerms(targetId)
    if (Array.isArray(direct) && direct.length > 0) return true

    // If it's a parent menu, check if any of its child tabs has permissions
    const childTabs = MENU_CHILD_TABS_MAP[targetId]
    if (childTabs && childTabs.some(tabId => {
      const p = getPerms(tabId)
      return Array.isArray(p) && p.length > 0
    })) {
      return true
    }

    // If it's a child tab, check inheritance
    const parentId = TAB_PARENT_MENU_MAP[targetId]
    if (parentId) {
      const siblingTabs = MENU_CHILD_TABS_MAP[parentId] || []
      const hasAnySiblingConfigured = siblingTabs.some(sibId => {
        const p = getPerms(sibId)
        return Array.isArray(p) && p.length > 0
      })
      if (!hasAnySiblingConfigured) {
        const parentPerms = getPerms(parentId)
        return Array.isArray(parentPerms) && parentPerms.length > 0
      }
    }

    return false
  }

  return {
    hasFullAccess,
    can: checkAction,
    hasAny: checkAnyAction,
    hasPerm: checkHasPerm
  }
}

/**
 * Resolves the primary landing route for a given user based on their assigned permissions and role
 */
export const getDefaultLandingRoute = (customUser = null) => {
  const simchaUser = customUser || JSON.parse(sessionStorage.getItem('simcha_user') || localStorage.getItem('simcha_user') || '{}')
  const hasFullAccess = simchaUser.role === 'Administrator' || (simchaUser.admin_access || []).includes('Full Admin Access')

  if (hasFullAccess) {
    return '/dashboard'
  }

  const perms = simchaUser.permissions || {}
  const adminAccess = simchaUser.admin_access || []

  const hasAccess = (menuId) => {
    if (adminAccess.includes(menuId)) return true
    const p = perms[menuId] || (menuId === 'settings_config' ? perms['settings_configs'] : menuId === 'settings_configs' ? perms['settings_config'] : null)
    if (Array.isArray(p) && p.length > 0) return true

    // Check if any child tab has permissions
    const childTabs = MENU_CHILD_TABS_MAP[menuId]
    if (childTabs && childTabs.some(tabId => Array.isArray(perms[tabId]) && perms[tabId].length > 0)) {
      return true
    }
    return false
  }

  // Priority-based Role Landing Resolution
  if (hasAccess('dashboard') || adminAccess.includes('Dashboard')) return '/dashboard'
  if (hasAccess('services_list') || hasAccess('services')) return '/services/list'
  if (hasAccess('services_new')) return '/services/new'
  if (hasAccess('outward_list') || hasAccess('all-bills')) return '/outward-list'
  if (hasAccess('outward') || hasAccess('create-bill')) return '/outward'
  if (hasAccess('quotations_list') || hasAccess('quotations-list')) return '/quotations/list'
  if (hasAccess('quotations')) return '/quotations'
  if (hasAccess('inward_list') || hasAccess('inward-reports')) return '/inward-list'
  if (hasAccess('inward')) return '/inward'
  if (hasAccess('materials_list') || hasAccess('all-materials')) return '/materials'
  if (hasAccess('materials_add') || hasAccess('add-material')) return '/materials/add'
  if (hasAccess('inventory_main') || hasAccess('inventory-stock')) return '/inventory'
  if (hasAccess('inventory_returns') || hasAccess('returns-adjustments')) return '/inventory/returns'
  if (hasAccess('categories_create') || hasAccess('categories')) return '/categories'
  if (hasAccess('departments_list') || hasAccess('departments-menu')) return '/departments'
  if (hasAccess('roles_list') || hasAccess('roles_add') || hasAccess('roles-menu')) return '/roles'
  if (hasAccess('users_list') || hasAccess('users_add') || hasAccess('users-menu')) return '/users'
  if (hasAccess('settings_profile') || hasAccess('profile-settings')) return '/settings/profile'
  if (hasAccess('settings_system') || hasAccess('system-settings')) return '/settings/system'
  if (hasAccess('settings_theme') || hasAccess('theme-settings')) return '/settings/theme'
  if (hasAccess('settings_config') || hasAccess('settings_configs') || hasAccess('configurations-settings')) return '/settings/configurations'

  return '/user-manual'
}

