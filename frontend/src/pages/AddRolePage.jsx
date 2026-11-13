import React, { useState, useEffect } from 'react'
import { Save, RefreshCw, ChevronDown } from '../components/common/icons'
import Swal from 'sweetalert2'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/api'
import { ToggleSwitch, Checkbox } from '../components/ui'
import { MENU_CHILD_TABS_MAP, TAB_PARENT_MENU_MAP } from '../utils/access'

const PERMISSIONS_DATA = [
  {
    category: 'Sidebar Menus',
    modules: [
      {
        id: 'menu_dashboard',
        name: 'Dashboard',
        subMenus: [{ id: 'dashboard', name: 'Dashboard', actions: ['View'] }]
      },
      {
        id: 'menu_bills',
        name: 'Bills',
        subMenus: [
          { id: 'inward', name: 'Inward', actions: ['Add', 'View'] },
          { id: 'inward_list', name: 'Inward List', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'quotations', name: 'Quotations', actions: ['Add', 'View'] },
          { id: 'quotations_list', name: 'Quotations List', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'outward', name: 'Outward', actions: ['Add', 'View'] },
          { id: 'outward_list', name: 'Outward List', actions: ['View', 'Edit', 'Delete', 'Download'] }
        ]
      },
      {
        id: 'menu_services',
        name: 'Services',
        subMenus: [
          { id: 'services_new', name: 'New Request', actions: ['Add', 'View'] },
          { id: 'services_list', name: 'Service List', actions: ['View', 'Edit', 'Delete', 'Download'] }
        ]
      },
      {
        id: 'menu_categories',
        name: 'Categories',
        subMenus: [{ id: 'categories_create', name: 'Create Category', actions: ['Add', 'View', 'Edit', 'Delete'] }]
      },
      {
        id: 'menu_materials',
        name: 'Materials',
        subMenus: [
          { id: 'materials_add', name: 'Add Material', actions: ['Add', 'View'] },
          { id: 'materials_list', name: 'All Materials', actions: ['View', 'Edit', 'Delete', 'Download'] }
        ]
      },
      {
        id: 'menu_inventory',
        name: 'Stock & Inventory',
        subMenus: [
          { id: 'inventory_main', name: 'Inventory', actions: ['View', 'Edit'] },
          { id: 'inventory_returns', name: 'Returns & Adjustments', actions: ['Add', 'View', 'Edit'] }
        ]
      },
      {
        id: 'menu_roles',
        name: 'Roles & Access',
        subMenus: [
          { id: 'departments_list', name: 'Departments', actions: ['Add', 'View', 'Edit', 'Delete'] },
          { id: 'roles_list', name: 'Roles', actions: ['Add', 'View', 'Edit', 'Delete'] },
          { id: 'users_list', name: 'Users', actions: ['Add', 'View', 'Edit', 'Delete'] }
        ]
      },
      {
        id: 'menu_settings',
        name: 'Settings',
        subMenus: [
          { id: 'settings_system', name: 'System Settings', actions: ['View', 'Edit'] },
          { id: 'settings_config', name: 'Configurations Settings', actions: ['View', 'Edit'] }
        ]
      }
    ]
  },
  {
    category: 'Quotations Page Tabs',
    modules: [
      {
        id: 'tabs_quotations',
        name: 'Quotations Tabs',
        subMenus: [
          { id: 'tab_quotations_active', name: 'Quotations', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'tab_quotations_converted', name: 'Converted', actions: ['View', 'Download'] },
          { id: 'tab_quotations_cancelled', name: 'Cancelled', actions: ['View', 'Delete', 'Download'] }
        ]
      }
    ]
  },
  {
    category: 'Outward / Bills Page Tabs',
    modules: [
      {
        id: 'tabs_bills',
        name: 'Outward Bills Tabs',
        subMenus: [
          { id: 'tab_bills_pending', name: 'Pending', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'tab_bills_paid', name: 'Paid', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'tab_bills_cancelled', name: 'Cancelled', actions: ['View', 'Download'] }
        ]
      }
    ]
  },
  {
    category: 'Services Page Tabs',
    modules: [
      {
        id: 'tabs_services',
        name: 'Service List Tabs',
        subMenus: [
          { id: 'tab_services_quotation', name: 'Quotation & approval', actions: ['View', 'Edit', 'Delete', 'Download'] },
          { id: 'tab_services_repair', name: 'Repair & ready', actions: ['View', 'Edit', 'Download'] },
          { id: 'tab_services_delivered', name: 'Delivered', actions: ['View', 'Download'] },
          { id: 'tab_services_cancelled', name: 'Cancelled', actions: ['View', 'Download'] }
        ]
      }
    ]
  },
  {
    category: 'Inventory Page Tabs',
    modules: [
      {
        id: 'tabs_inventory',
        name: 'Inventory Tabs',
        subMenus: [
          { id: 'tab_overview', name: 'Stock Overview', actions: ['View', 'Edit', 'Download'] },
          { id: 'tab_reorder', name: 'Low Stock / Reorder', actions: ['View', 'Edit', 'Download'] },
          { id: 'tab_scrap', name: 'Scrap / Defective', actions: ['View', 'Download'] }
        ]
      }
    ]
  },
  {
    category: 'Returns & Adjustments Tabs',
    modules: [
      {
        id: 'tabs_returns',
        name: 'Returns & Adjustments Tabs',
        subMenus: [
          { id: 'tab_entry', name: 'Return Entry', actions: ['Add', 'View'] },
          { id: 'tab_pending', name: 'Pending QC', actions: ['View', 'Edit'] },
          { id: 'tab_completed', name: 'Completed & Resolved', actions: ['View', 'Download'] },
          { id: 'tab_defective', name: 'Defective & QC Failed', actions: ['View'] },
          { id: 'tab_credit', name: 'Credit Notes', actions: ['View'] }
        ]
      }
    ]
  },
  {
    category: 'System Settings Tabs',
    modules: [
      {
        id: 'tabs_system_settings',
        name: 'System Settings Tabs',
        subMenus: [
          { id: 'tab_settings_company', name: 'Company Profile', actions: ['View', 'Edit'] },
          { id: 'tab_settings_taxes', name: 'Tax Rates', actions: ['View', 'Edit'] },
          { id: 'tab_settings_bank', name: 'Bank Account', actions: ['View', 'Edit'] },
          { id: 'tab_settings_terms', name: 'Terms & Conditions', actions: ['View', 'Edit'] }
        ]
      }
    ]
  },
  {
    category: 'Configurations Settings Tabs',
    modules: [
      {
        id: 'tabs_config_settings',
        name: 'Configurations Tabs',
        subMenus: [
          { id: 'tab_config_mail', name: 'Mail (SMTP)', actions: ['View', 'Edit'] },
          { id: 'tab_config_cloudinary', name: 'Cloud Storage', actions: ['View', 'Edit'] },
          { id: 'tab_config_ai', name: 'AI Settings', actions: ['View', 'Edit'] }
        ]
      }
    ]
  }
]

// All possible action types for table headers
const ALL_ACTIONS = ['Add', 'View', 'Edit', 'Delete', 'Download']

export default function AddRolePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState({})
  const [adminAccess, setAdminAccess] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Collapsible Categories State (Default: all closed)
  const [openCategories, setOpenCategories] = useState({})

  const toggleCategory = (catIdx) => {
    setOpenCategories(prev => ({
      ...prev,
      [catIdx]: !prev[catIdx]
    }))
  }

  const handleExpandAll = () => {
    const allOpen = {}
    PERMISSIONS_DATA.forEach((_, idx) => {
      allOpen[idx] = true
    })
    setOpenCategories(allOpen)
  }

  const handleCollapseAll = () => {
    setOpenCategories({})
  }

  useEffect(() => {
    if (editId) {
      fetchRoleDetails(editId)
    }
  }, [editId])

  const fetchRoleDetails = async (id) => {
    setIsLoading(true)
    try {
      const res = await fetch(API_ENDPOINTS.ROLE_BY_ID(id))
      const data = await res.json()
      if (data.success && data.role) {
        setRoleName(data.role.name)
        setDescription(data.role.description || '')
        setPermissions(data.role.permissions || {})
        setAdminAccess(data.role.admin_access || [])
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to fetch role details', confirmButtonColor: '#FF8533' })
      }
    } catch (err) {
      console.error('Fetch role error:', err)
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error fetching role', confirmButtonColor: '#FF8533' })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle checkbox toggle with Two-Way Parent/Child Synchronization
  const handleToggle = (subId, action) => {
    setPermissions(prev => {
      const currentSubPerms = prev[subId] || []
      const hasAction = currentSubPerms.includes(action)
      
      let newSubPerms
      if (hasAction) {
        newSubPerms = currentSubPerms.filter(a => a !== action)
      } else {
        newSubPerms = [...currentSubPerms, action]
      }
      
      const updated = {
        ...prev,
        [subId]: newSubPerms
      }

      // Case 1: subId is a PARENT menu (e.g. outward_list, quotations_list, services_list)
      const childTabs = MENU_CHILD_TABS_MAP[subId]
      if (childTabs) {
        if (!hasAction) {
          // Turning ON action on parent -> sync action to all child tabs
          childTabs.forEach(childId => {
            const childPerms = updated[childId] || []
            if (!childPerms.includes(action)) {
              updated[childId] = [...childPerms, action]
            }
          })
        } else {
          // Turning OFF action on parent -> remove action from all child tabs
          childTabs.forEach(childId => {
            const childPerms = updated[childId] || []
            if (childPerms.includes(action)) {
              updated[childId] = childPerms.filter(a => a !== action)
            }
          })
        }
      }

      // Case 2: subId is a CHILD tab (e.g. tab_bills_pending)
      const parentId = TAB_PARENT_MENU_MAP[subId]
      if (parentId) {
        if (!hasAction) {
          // Turning ON action on child tab -> ensure parent menu has action enabled
          const parentPerms = updated[parentId] || []
          if (!parentPerms.includes(action)) {
            updated[parentId] = [...parentPerms, action]
          }
        } else {
          // Turning OFF action on child tab: if no sibling child tabs have this action left, remove from parent
          const siblingTabs = MENU_CHILD_TABS_MAP[parentId] || []
          const anySiblingHasAction = siblingTabs.some(sibId => {
            const sibPerms = updated[sibId] || []
            return sibPerms.includes(action)
          })
          if (!anySiblingHasAction) {
            const parentPerms = updated[parentId] || []
            updated[parentId] = parentPerms.filter(a => a !== action)
          }
        }
      }

      return updated
    })
  }

  // Calculate selection state (all checked vs indeterminate) for a module's table
  const getModuleSelectionState = (module) => {
    let totalApplicable = 0
    let totalEnabled = 0

    module.subMenus.forEach(sub => {
      const activePerms = permissions[sub.id] || []
      sub.actions.forEach(action => {
        totalApplicable++
        if (activePerms.includes(action)) {
          totalEnabled++
        }
      })
    })

    const isAllChecked = totalApplicable > 0 && totalEnabled === totalApplicable
    const isIndeterminate = totalEnabled > 0 && totalEnabled < totalApplicable

    return { isAllChecked, isIndeterminate }
  }

  // Handle bulk select/deselect for an entire module table
  const handleToggleModuleAll = (module, targetState) => {
    setPermissions(prev => {
      const updated = { ...prev }

      module.subMenus.forEach(sub => {
        const subId = sub.id

        sub.actions.forEach(action => {
          let newPerms = updated[subId] || []
          if (targetState) {
            if (!newPerms.includes(action)) {
              newPerms = [...newPerms, action]
            }
          } else {
            newPerms = newPerms.filter(a => a !== action)
          }
          updated[subId] = newPerms

          // Case 1: subId is a PARENT menu
          const childTabs = MENU_CHILD_TABS_MAP[subId]
          if (childTabs) {
            childTabs.forEach(childId => {
              const childPerms = updated[childId] || []
              if (targetState) {
                if (!childPerms.includes(action)) {
                  updated[childId] = [...childPerms, action]
                }
              } else {
                updated[childId] = childPerms.filter(a => a !== action)
              }
            })
          }

          // Case 2: subId is a CHILD tab
          const parentId = TAB_PARENT_MENU_MAP[subId]
          if (parentId) {
            if (targetState) {
              const parentPerms = updated[parentId] || []
              if (!parentPerms.includes(action)) {
                updated[parentId] = [...parentPerms, action]
              }
            } else {
              const siblingTabs = MENU_CHILD_TABS_MAP[parentId] || []
              const anySiblingHasAction = siblingTabs.some(sibId => {
                const sibPerms = updated[sibId] || []
                return sibPerms.includes(action)
              })
              if (!anySiblingHasAction) {
                const parentPerms = updated[parentId] || []
                updated[parentId] = parentPerms.filter(a => a !== action)
              }
            }
          }
        })
      })

      return updated
    })
  }

  const handleToggleAdminAccess = (menu) => {
    setAdminAccess(prev => {
      if (prev.includes(menu)) {
        return prev.filter(m => m !== menu)
      } else {
        return [...prev, menu]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!roleName) {
      Swal.fire({ icon: 'warning', title: 'Role Name Required', text: 'Please enter a role name.', confirmButtonColor: '#FF8533' })
      return
    }

    setIsSaving(true)
    try {
      const url = editId ? API_ENDPOINTS.ROLE_BY_ID(editId) : API_ENDPOINTS.ROLES
      const method = editId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName,
          description,
          permissions,
          admin_access: adminAccess
        })
      })
      const data = await res.json()

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: editId ? 'Role Updated!' : 'Role Created!',
          text: 'Role and permissions saved successfully.',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          navigate('/roles/list')
        })
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to save role', confirmButtonColor: '#FF8533' })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'Error', text: 'Network error while saving role', confirmButtonColor: '#FF8533' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setRoleName('')
    setDescription('')
    setPermissions({})
    setAdminAccess([])
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50 dark:bg-[#090d16] min-h-screen text-slate-800 dark:text-slate-200">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">
          {editId ? 'Edit Role' : 'Create Role'}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Permissions (Approx 65-70%) */}
        <div className="w-full lg:w-2/3 space-y-4">
          {/* Header Toolbar for Matrix */}
          <div className="flex items-center justify-between bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Permissions Categories ({PERMISSIONS_DATA.length})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-[11px] font-semibold text-slate-900 dark:text-white hover:underline px-2 py-1 rounded cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline px-2 py-1 rounded cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {PERMISSIONS_DATA.map((categoryGroup, idx) => {
            const isOpen = Boolean(openCategories[idx])
            const isSidebarMenu = categoryGroup.category === 'Sidebar Menus'
            const columnHeaderTitle = isSidebarMenu ? "MENUS" : "TABS"

            // Calculate active actions count in this section
            let activeCount = 0
            categoryGroup.modules.forEach(m => {
              m.subMenus.forEach(s => {
                const perms = permissions[s.id] || []
                activeCount += s.actions.filter(a => perms.includes(a)).length
              })
            })

            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#0f172a] rounded-lg shadow-xs border border-slate-200 dark:border-slate-800 transition-all duration-200 overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(idx)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold uppercase tracking-wider text-[#FF8533] dark:text-blue-400">
                      {categoryGroup.category}
                    </span>
                    {activeCount > 0 && (
                      <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {activeCount} Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-medium hidden sm:inline-block">
                      {isOpen ? 'Collapse' : 'Expand'}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FF8533] dark:text-blue-400' : ''}`}
                    />
                  </div>
                </button>

                {/* Smooth Collapsible Content Container */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-4 mt-1">
                      {categoryGroup.modules.map((module) => {
                        const { isAllChecked, isIndeterminate } = getModuleSelectionState(module)

                        return (
                          <div key={module.id} className="border border-slate-200 dark:border-slate-700/70 rounded-lg p-4 bg-slate-50/70 dark:bg-[#151f32]">
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                              {module.name}
                            </h3>
                            
                            <div className="w-full overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[500px]">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                    <th className="pb-2.5 pr-4 font-bold text-slate-900 dark:text-white min-w-[140px]">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isAllChecked}
                                          indeterminate={isIndeterminate}
                                          onChange={() => handleToggleModuleAll(module, !isAllChecked)}
                                          size="sm"
                                          variant="primary"
                                          title={isAllChecked ? "Deselect all permissions in this table" : "Select all permissions in this table"}
                                        />
                                        <span>{columnHeaderTitle}</span>
                                      </div>
                                    </th>
                                    {ALL_ACTIONS.map(action => (
                                      <th key={action} className="pb-2.5 px-2 font-bold text-slate-600 dark:text-slate-300 text-center min-w-[60px]">
                                        {action}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/80">
                                {module.subMenus.map((sub) => (
                                  <tr key={sub.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300 pr-4 whitespace-nowrap">
                                      {sub.name}
                                    </td>
                                    {ALL_ACTIONS.map(action => {
                                      const isApplicable = sub.actions.includes(action)
                                      const isChecked = (permissions[sub.id] || []).includes(action)
                                      return (
                                        <td key={action} className="py-2 px-2 text-center">
                                          {isApplicable ? (
                                            <div className="flex justify-center">
                                              <ToggleSwitch
                                                size="sm"
                                                checked={isChecked}
                                                onChange={() => handleToggle(sub.id, action)}
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex justify-center">
                                              <div
                                                className="relative inline-flex h-4.5 w-8 flex-shrink-0 rounded-full bg-gray-200/70 dark:bg-slate-800/80 border border-gray-300/60 dark:border-slate-700/60 opacity-25 cursor-not-allowed select-none"
                                                title="Action not applicable for this module"
                                              >
                                                <span className="inline-block h-3.5 w-3.5 transform translate-x-0 rounded-full bg-gray-400 dark:bg-slate-600 shadow-2xs" />
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Side: Role Details (Approx 30-35%) */}
        <div className="w-full lg:w-1/3">
          <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold mb-6">Role Details</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter role name (e.g. Cashier)"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-[#151f32] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Short role description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-[#151f32] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              {/* Admin Access Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Admin Access</h3>
                <div className="space-y-3">
                  {[
                    'Full Admin Access',
                    'Dashboard',
                    'Bills',
                    'Services',
                    'Categories',
                    'Materials',
                    'Stock & Inventory',
                    'Settings',
                    'Roles & Access'
                  ].map((menu) => (
                    <label key={menu} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={adminAccess.includes(menu)}
                        onChange={() => handleToggleAdminAccess(menu)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:border-slate-600 dark:bg-slate-700 transition-all"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {menu}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 py-2 px-4 border border-blue-500 text-blue-600 dark:text-blue-400 font-semibold rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>

      </div>
      )}
    </div>
  )
}

