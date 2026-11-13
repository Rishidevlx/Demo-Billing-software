import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Receipt,
  Layers,
  Boxes,
  PackageOpen,
  Settings,
  ChevronDown,
  ChevronRight,
  Circle,
  Wrench,
  BookOpen,
  UserKey,
  PanelLeftClose,
  PanelLeftOpen
} from '../common/icons'
import logoImg from '../../assets/Logo/Demo-logo.svg'
import faviconImg from '../../assets/Logo/favicon.ico'
import { useTheme } from '../../context/ThemeContext'

import { MENU_CHILD_TABS_MAP } from '../../utils/access'

export default function Sidebar({
  isCollapsed,
  toggleSidebar,
  activeRoute,
  activePath = '',
  setActiveRoute,
  isMobileOpen,
  closeMobileSidebar
}) {
  const { theme, logo: themeLogo, favicon: themeFavicon } = useTheme()
  const sidebarBg = theme?.sidebarBg || '#FFFFFF'

  // State for open dropdown menus when expanded
  const [openMenus, setOpenMenus] = useState({
    bills: false,
    services: false,
    categories: false,
    materials: false,
    inventory: false,
    settings: false,
    rolesPermissions: false
  })

  // State for hover flyout when collapsed
  const [hoveredMenuId, setHoveredMenuId] = useState(null)

  // Determine active route from path or fallback
  const currentPath = activePath || (activeRoute ? `/${activeRoute}` : '/dashboard')

  useEffect(() => {
    if (currentPath.includes('settings')) {
      setOpenMenus(prev => ({ ...prev, settings: true }))
    } else if (currentPath.includes('service')) {
      setOpenMenus(prev => ({ ...prev, services: true }))
    } else if (currentPath.includes('categor')) {
      setOpenMenus(prev => ({ ...prev, categories: true }))
    } else if (currentPath.includes('material')) {
      setOpenMenus(prev => ({ ...prev, materials: true }))
    } else if (
      currentPath.includes('inventory') ||
      currentPath.includes('stock') ||
      currentPath.includes('return')
    ) {
      setOpenMenus(prev => ({ ...prev, inventory: true }))
    } else if (
      currentPath.includes('inward') ||
      currentPath.includes('outward') ||
      currentPath.includes('bill')
    ) {
      setOpenMenus(prev => ({ ...prev, bills: true }))
    } else if (
      currentPath.includes('role') ||
      currentPath.includes('user')
    ) {
      setOpenMenus(prev => ({ ...prev, rolesPermissions: true }))
    }
  }, [currentPath])

  const toggleMenu = (key) => {
    if (isCollapsed) return
    setOpenMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Menu items list with URL paths
  const menuConfig = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      single: true
    },
    {
      id: 'bills',
      title: 'Bills',
      icon: Receipt,
      subItems: [
        { id: 'inward', title: 'Inward', path: '/inward' },
        { id: 'inward-reports', title: 'Inward List', path: '/inward-list' },
        { id: 'quotations', title: 'Quotations', path: '/quotations' },
        { id: 'quotations-list', title: 'Quotations List', path: '/quotations/list' },
        { id: 'create-bill', title: 'Outward', path: '/outward' },
        { id: 'all-bills', title: 'Outward List', path: '/outward-list' }
      ]
    },
    {
      id: 'services',
      title: 'Services',
      icon: Wrench,
      subItems: [
        { id: 'new-service', title: 'New Request', path: '/services/new' },
        { id: 'all-services', title: 'Service List', path: '/services/list' }
      ]
    },
    {
      id: 'categories',
      title: 'Categories',
      icon: Layers,
      subItems: [
        { id: 'create-category', title: 'Create Category', path: '/categories' }
      ]
    },
    {
      id: 'materials',
      title: 'Materials',
      icon: Boxes,
      subItems: [
        { id: 'add-material', title: 'Add Material', path: '/materials/add' },
        { id: 'all-materials', title: 'All Materials', path: '/materials' }
      ]
    },
    {
      id: 'inventory',
      title: 'Stock & Inventory',
      icon: PackageOpen,
      subItems: [
        { id: 'inventory-stock', title: 'Inventory', path: '/inventory' },
        { id: 'returns-adjustments', title: 'Returns & Adjustments', path: '/inventory/returns' }
      ]
    },
    {
      id: 'roles-permissions',
      title: 'Roles & Access',
      icon: UserKey,
      subItems: [
        { id: 'departments-menu', title: 'Departments', path: '/departments' },
        { id: 'roles-menu', title: 'Roles', path: '/roles' },
        { id: 'users-menu', title: 'Users', path: '/users' }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      subItems: [
        { id: 'profile-settings', title: 'Profile Settings', path: '/settings/profile' },
        { id: 'system-settings', title: 'System Settings', path: '/settings/system' },
        { id: 'theme-settings', title: 'Theme Settings', path: '/settings/theme' },
        { id: 'configurations-settings', title: 'Configurations Settings', path: '/settings/configurations' }
      ]
    },
    {
      id: 'user-manual',
      title: 'User Manual',
      icon: BookOpen,
      path: '/user-manual',
      single: true
    }
  ]


  const isSubActive = (sub) => {
    if (currentPath === sub.path) return true
    if (sub.id === activeRoute) return true
    if (sub.id === 'inward-reports' && (currentPath === '/inward-reports' || currentPath === '/inward-list')) return true
    if (sub.id === 'quotations' && (currentPath === '/quotations' || currentPath === '/create-quotation')) return true
    if (sub.id === 'quotations-list' && (currentPath === '/quotations/list' || currentPath === '/quotations-list')) return true
    if (sub.id === 'create-bill' && (currentPath === '/create-bill' || currentPath === '/outward')) return true
    if (sub.id === 'all-bills' && (currentPath === '/all-bills' || currentPath === '/outward-list' || currentPath === '/bills')) return true
    if (sub.id === 'new-service' && (currentPath === '/new-service' || currentPath === '/services/new' || currentPath === '/service/new')) return true
    if (sub.id === 'all-services' && (currentPath === '/all-services' || currentPath === '/services/list' || currentPath === '/services' || currentPath === '/service')) return true
    if (sub.id === 'all-materials' && (currentPath === '/all-materials' || currentPath === '/materials')) return true
    if (sub.id === 'add-material' && (currentPath === '/add-material' || currentPath === '/materials/add')) return true
    if (sub.id === 'inventory-stock' && (currentPath === '/inventory' || currentPath === '/stock')) return true
    if (sub.id === 'returns-adjustments' && (currentPath === '/inventory/returns' || currentPath === '/returns' || currentPath === '/returns-adjustments')) return true
    if (sub.id === 'profile-settings' && (currentPath === '/profile-settings' || currentPath === '/settings/profile' || currentPath === '/profile')) return true
    if (sub.id === 'system-settings' && (currentPath === '/system-settings' || currentPath === '/settings/system')) return true
    if (sub.id === 'theme-settings' && (currentPath === '/theme-settings' || currentPath === '/settings/theme')) return true
    if (sub.id === 'configurations-settings' && (currentPath === '/configurations-settings' || currentPath === '/settings/configurations')) return true
    if (sub.id === 'departments-menu' && (currentPath === '/departments' || currentPath.startsWith('/departments'))) return true
    if (sub.id === 'roles-menu' && (currentPath === '/roles' || currentPath.startsWith('/roles'))) return true
    if (sub.id === 'users-menu' && (currentPath === '/users' || currentPath.startsWith('/users'))) return true
    if (sub.id === 'add-role' && currentPath === '/roles/add') return true
    if (sub.id === 'role-list' && (currentPath === '/roles/list' || currentPath === '/roles')) return true
    if (sub.id === 'add-user' && currentPath === '/users/add') return true
    if (sub.id === 'users-list' && (currentPath === '/users/list' || currentPath === '/users')) return true
    return false
  }

  const handleItemClick = (target) => {
    if (setActiveRoute) {
      setActiveRoute(target)
    }
    setHoveredMenuId(null)
    if (closeMobileSidebar) closeMobileSidebar()
  }

  // Filter Menus based on Access Rights
  const simchaUser = JSON.parse(
    sessionStorage.getItem('simcha_user') || localStorage.getItem('simcha_user') || '{}'
  )
  const userAdminAccess = simchaUser.admin_access || []
  const userPermissions = simchaUser.permissions || {}
  const hasFullAccess = userAdminAccess.includes('Full Admin Access') || simchaUser.role === 'Administrator'

  const hasAccessToSubItem = (subId) => {
    if (hasFullAccess) return true
    
    // Profile Settings is globally accessible for all authenticated users
    if (subId === 'profile-settings') return true

    // Map sidebar sub item IDs to permission IDs
    const permIdMap = {
      'inward': 'inward',
      'inward-reports': 'inward_list',
      'quotations': 'quotations',
      'quotations-list': 'quotations_list',
      'create-bill': 'outward',
      'all-bills': 'outward_list',
      'new-service': 'services_new',
      'all-services': 'services_list',
      'create-category': 'categories_create',
      'add-material': 'materials_add',
      'all-materials': 'materials_list',
      'inventory-stock': 'inventory_main',
      'returns-adjustments': 'inventory_returns',
      'profile-settings': 'settings_profile',
      'system-settings': 'settings_system',
      'configurations-settings': 'settings_config',
      'departments-menu': 'departments_list',
      'roles-menu': 'roles_list',
      'users-menu': 'users_list',
      'add-role': 'roles_add',
      'role-list': 'roles_list',
      'add-user': 'users_add',
      'users-list': 'users_list'
    }

    const targetPermId = permIdMap[subId] || subId
    const getPermArray = (id) => {
      const p = userPermissions[id]
      if (Array.isArray(p) && p.length > 0) return p
      if (id === 'settings_config') return userPermissions['settings_configs'] || []
      if (id === 'settings_configs') return userPermissions['settings_config'] || []
      return []
    }

    const perms = getPermArray(targetPermId)
    if (Array.isArray(perms) && perms.length > 0) return true

    // Check if any child tab of this menu has permissions
    const childTabs = MENU_CHILD_TABS_MAP[targetPermId] || (targetPermId === 'settings_config' ? MENU_CHILD_TABS_MAP['settings_configs'] : null)
    if (childTabs && childTabs.some(tabId => {
      const p = userPermissions[tabId]
      return Array.isArray(p) && p.length > 0
    })) {
      return true
    }

    return false
  }

  const hasAccessToMenu = (menu) => {
    if (hasFullAccess) return true
    
    // Check if the menu title is explicitly in admin_access
    if (userAdminAccess.includes(menu.title)) return true

    // Make User Manual globally accessible
    if (menu.id === 'user-manual') return true

    // If it's a single menu item (e.g. Dashboard), check permissions
    if (menu.single) {
      const perms = userPermissions[menu.id] || []
      return perms.length > 0
    }

    // If it has subItems, check if ANY subItem has permissions
    if (menu.subItems) {
      return menu.subItems.some(sub => hasAccessToSubItem(sub.id))
    }

    return false
  }

  const visibleMenuConfig = menuConfig
    .filter(menu => hasAccessToMenu(menu))
    .map(menu => {
      if (menu.single) return menu
      return {
        ...menu,
        subItems: menu.subItems.filter(sub => hasAccessToSubItem(sub.id))
      }
    })

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{ backgroundColor: sidebarBg }}
        className={`fixed top-0 left-0 bottom-0 z-50 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between shadow-xs ${
          isCollapsed ? 'w-20 overflow-visible' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Logo rendered on Sidebar background */}
        <div className="relative">
          <div
            style={{ backgroundColor: sidebarBg }}
            className="h-20 sm:h-22 flex items-center justify-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 transition-all duration-300"
          >
            {isCollapsed ? (
              <div className="w-13 h-13 flex items-center justify-center p-1 overflow-hidden hover:scale-105 transition-transform">
                <img
                  src={themeFavicon || faviconImg}
                  alt="Favicon"
                  className="w-full h-full object-contain rounded-xs drop-shadow-xs"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full px-2 py-1">
                <img
                  src={themeLogo || logoImg}
                  alt="Brand Logo"
                  className="h-14 sm:h-16 max-h-16 max-w-[225px] w-auto object-contain drop-shadow-xs transition-transform hover:scale-105 duration-200"
                />
              </div>
            )}
          </div>

          {/* Menu Section */}
          <div className={`p-3 sidebar-scrollbar ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto max-h-[calc(100vh-130px)]'}`}>
            {!isCollapsed && (
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Menu
              </div>
            )}

            <nav className="space-y-1">
              {visibleMenuConfig.map((item) => {
                const Icon = item.icon
                const isSingle = item.single
                const isMenuOpen = openMenus[item.id]
                const isActiveParent = !isSingle && item.subItems.some(sub => isSubActive(sub))
                const isSingleActive = isSingle && (currentPath === item.path || (item.id === 'dashboard' && (currentPath === '/' || currentPath === '/dashboard')) || currentPath === `/${item.id}`)
                const isHovered = isCollapsed && hoveredMenuId === item.id

                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => isCollapsed && setHoveredMenuId(item.id)}
                    onMouseLeave={() => isCollapsed && setHoveredMenuId(null)}
                  >
                    {isSingle ? (
                      /* Single Item (e.g. Dashboard, User Manual) */
                      <button
                        onClick={() => handleItemClick(item.path || item.id)}
                        className={`w-full flex items-center ${
                          isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                        } rounded-none text-xs sm:text-[13.5px] transition-colors duration-150 cursor-pointer group ${
                          isSingleActive
                            ? 'text-[#FF8533] font-bold bg-orange-50 dark:bg-orange-950/30 border-r-2 border-[#FF8533]'
                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                        title={isCollapsed ? item.title : undefined}
                      >
                        <div className="flex items-center gap-3.5">
                          <Icon size={19} className={isSingleActive ? 'text-[#FF8533]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors'} />
                          {!isCollapsed && <span className="tracking-wide">{item.title}</span>}
                        </div>
                      </button>
                    ) : (
                      /* Parent Item with Collapsible Submenu in Expanded mode */
                      <div>
                        <button
                          onClick={() => toggleMenu(item.id)}
                          className={`w-full flex items-center ${
                            isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                          } rounded-none text-xs sm:text-[13.5px] transition-colors duration-150 cursor-pointer group ${
                            isActiveParent
                              ? 'text-[#FF8533] font-bold bg-orange-50/70 dark:bg-orange-950/20'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                          title={isCollapsed ? item.title : undefined}
                        >
                          <div className="flex items-center gap-3.5">
                            <Icon size={19} className={isActiveParent ? 'text-[#FF8533]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors'} />
                            {!isCollapsed && <span className="tracking-wide whitespace-nowrap">{item.title}</span>}
                          </div>
                          {!isCollapsed && (
                            <span className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-90 text-[#FF8533]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                              <ChevronRight size={15} />
                            </span>
                          )}
                        </button>

                        {/* Submenu Accordion Container with Smooth Transition */}
                        {!isCollapsed && (
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              isMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="mt-1 ml-4 pl-3.5 border-l border-slate-200 dark:border-slate-800 space-y-1 py-1">
                                {item.subItems.map((sub) => {
                                   const active = isSubActive(sub)
                                   return (
                                     <button
                                       key={sub.id}
                                       onClick={() => handleItemClick(sub.path || sub.id)}
                                       className={`w-full text-left px-2 py-1.5 rounded-none text-xs sm:text-[13px] transition-colors duration-150 flex items-center gap-2.5 cursor-pointer group ${
                                         active
                                           ? 'text-[#FF8533] font-bold bg-orange-50 dark:bg-orange-950/30'
                                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                       }`}
                                     >
                                       <span
                                         className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                           active ? 'bg-[#FF8533]' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400'
                                         }`}
                                       />
                                       <span>{sub.title}</span>
                                     </button>
                                   )
                                 })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Signature Boxy Flyout Hover Submenu (Floating Outside Sidebar) */}
                    {isCollapsed && isHovered && (
                      <>
                        {isSingle ? (
                          /* Tooltip Badge for Single Items */
                          <div
                            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[999] whitespace-nowrap rounded-xs shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                          >
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold text-xs tracking-wide">
                              <Icon size={14} className="text-[#FF8533]" />
                              <span>{item.title}</span>
                            </div>
                          </div>
                        ) : (
                          /* Floating Flyout Menu for Nested Items */
                          <div
                            className="absolute left-full top-0 ml-3 z-[999] min-w-[210px] rounded-xs shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 before:absolute before:-left-3 before:top-0 before:w-3 before:h-full"
                          >
                            {/* Header Title in Flyout */}
                            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 mb-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="text-[#FF8533]" />
                                <span>{item.title}</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                                {item.subItems.length}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {item.subItems.map((sub) => {
                                const active = isSubActive(sub)
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={() => handleItemClick(sub.path || sub.id)}
                                    className={`w-full text-left px-3 py-1.5 rounded-none text-xs font-medium transition-colors duration-150 flex items-center gap-2.5 cursor-pointer ${
                                      active
                                        ? 'text-[#FF8533] font-bold bg-orange-50 dark:bg-orange-950/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        active ? 'bg-[#FF8533]' : 'bg-slate-300'
                                      }`}
                                    />
                                    <span>{sub.title}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Collapse Menu Button */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            } rounded-xs text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group`}
            title={isCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
          >
            <div className="flex items-center gap-2.5">
              {isCollapsed ? (
                <PanelLeftOpen size={18} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
              ) : (
                <>
                  <PanelLeftClose size={18} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                  <span className="tracking-wide text-xs">Collapse menu</span>
                </>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                [
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

