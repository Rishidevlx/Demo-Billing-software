import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { API_ENDPOINTS, getAuthHeaders } from '../../../config/api'
import {
  FileText,
  Hash,
  Receipt,
  ShieldCheck,
  Edit2,
  Save,
  Check,
  Copy,
  Lock
} from '../../common/icons'
import { SettingSectionCard, StatusPill, showToast } from '../../ui'

function MailTemplateCard({
  title,
  pillStatus,
  subject,
  body,
  availableTags = [],
  isEditing,
  onChangeSubject,
  onChangeBody,
  maxSubjectChars = 50,
  maxBodyChars = 250
}) {
  const subjectInputRef = React.useRef(null)
  const bodyTextareaRef = React.useRef(null)
  
  // Track which field was last active ('subject' or 'body') and cursor selection range
  const lastActiveRef = React.useRef({ field: 'body', start: 0, end: 0 })

  const recordCursor = (field, el) => {
    if (el) {
      lastActiveRef.current = {
        field,
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0
      }
    }
  }

  const handleTagClick = (tag) => {
    if (isEditing) {
      const active = lastActiveRef.current || { field: 'body', start: 0, end: 0 }
      
      if (active.field === 'subject' && subjectInputRef.current) {
        const input = subjectInputRef.current
        const s = active.start ?? input.selectionStart ?? (subject || '').length
        const e = active.end ?? input.selectionEnd ?? (subject || '').length
        const currentVal = subject || ''
        const prefix = currentVal.slice(0, s)
        const suffix = currentVal.slice(e)
        const newVal = (prefix + tag + suffix).slice(0, maxSubjectChars)
        onChangeSubject(newVal)
        const nextPos = Math.min(prefix.length + tag.length, maxSubjectChars)
        lastActiveRef.current = { field: 'subject', start: nextPos, end: nextPos }
        setTimeout(() => {
          if (input) {
            input.focus()
            input.setSelectionRange(nextPos, nextPos)
          }
        }, 20)
      } else {
        // Body textarea
        const textarea = bodyTextareaRef.current
        const s = active.start ?? textarea?.selectionStart ?? (body || '').length
        const e = active.end ?? textarea?.selectionEnd ?? (body || '').length
        const currentVal = body || ''
        const prefix = currentVal.slice(0, s)
        const suffix = currentVal.slice(e)
        const newVal = (prefix + tag + suffix).slice(0, maxBodyChars)
        onChangeBody(newVal)
        const nextPos = Math.min(prefix.length + tag.length, maxBodyChars)
        lastActiveRef.current = { field: 'body', start: nextPos, end: nextPos }
        setTimeout(() => {
          if (textarea) {
            textarea.focus()
            textarea.setSelectionRange(nextPos, nextPos)
          }
        }, 20)
      }
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(tag)
    }
    showToast.success(`Copied ${tag} to clipboard!`)
  }

  return (
    <div className="bg-gray-50/50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 p-5 rounded-none space-y-4 font-['Poppins',sans-serif] transition-colors">
      {/* Header: Title on Left, Badge on Right Corner */}
      <div className="pb-2 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 tracking-wide">
          {title}
        </h3>
        <StatusPill status={pillStatus} size="sm" />
      </div>

      {/* Subject Line Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1">
            <span>Email Subject Line Template</span>
            <span className="text-red-500">*</span>
          </label>
          <span className={`text-[10px] font-mono ${subject.length > maxSubjectChars ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
            {subject.length}/{maxSubjectChars} chars
          </span>
        </div>
        <div className="relative">
          <input
            ref={subjectInputRef}
            type="text"
            required
            disabled={!isEditing}
            maxLength={maxSubjectChars}
            value={subject}
            onFocus={(e) => recordCursor('subject', e.target)}
            onClick={(e) => recordCursor('subject', e.target)}
            onKeyUp={(e) => recordCursor('subject', e.target)}
            onSelect={(e) => recordCursor('subject', e.target)}
            onChange={(e) => {
              recordCursor('subject', e.target)
              onChangeSubject(e.target.value.slice(0, maxSubjectChars))
            }}
            placeholder="e.g. Tax Invoice {invoice_number} - {company_name}"
            className={`w-full px-3.5 py-2 text-xs font-medium rounded-none transition-all ${
              isEditing
                ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500 shadow-2xs'
                : 'text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed select-none'
            }`}
          />
        </div>
      </div>

      {/* Message Body Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1">
            <span>Email Message Body Template</span>
            <span className="text-red-500">*</span>
          </label>
          <span className={`text-[10px] font-mono ${body.length > maxBodyChars ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
            {body.length}/{maxBodyChars} chars
          </span>
        </div>
        <textarea
          ref={bodyTextareaRef}
          rows={5}
          required
          disabled={!isEditing}
          maxLength={maxBodyChars}
          value={body}
          onFocus={(e) => recordCursor('body', e.target)}
          onClick={(e) => recordCursor('body', e.target)}
          onKeyUp={(e) => recordCursor('body', e.target)}
          onSelect={(e) => recordCursor('body', e.target)}
          onChange={(e) => {
            recordCursor('body', e.target)
            onChangeBody(e.target.value.slice(0, maxBodyChars))
          }}
          placeholder="Type the message body here. Click any of the available tags below to insert..."
          className={`w-full px-3.5 py-2 text-xs font-medium rounded-none transition-all resize-y min-h-[130px] ${
            isEditing
              ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500 shadow-2xs'
              : 'text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed select-none'
          }`}
        />
      </div>

      {/* Available Tags: White background and Border */}
      <div className="pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mr-1">
            Available Tags:
          </span>

          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleTagClick(tag)}
              title={isEditing ? `Click to insert ${tag} into active field` : `Click to copy ${tag}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-none shadow-2xs hover:border-[#FF8533] hover:text-[#FF8533] dark:hover:border-blue-400 dark:hover:text-blue-300 cursor-pointer transition-all"
            >
              <span>{tag}</span>
              <Copy size={11} className="text-gray-400 dark:text-slate-500 hover:text-gray-600" />
            </button>
          ))}
        </div>
      </div>

      {!isEditing && (
        <p className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1.5 pt-0.5">
          <Lock size={11} />
          <span>Click Edit above to customize subject or message body.</span>
        </p>
      )}
    </div>
  )
}

export default function MailTemplatesSection({ canEdit = true }) {
  const [activeSubTab, setActiveSubTab] = useState('quotations') // 'quotations' | 'invoices' | 'receipts' | 'auth'

  // Sub-Menu Definitions (Sidebar) with Edit labels
  const subMenus = [
    {
      id: 'quotations',
      label: 'Quotations',
      icon: FileText,
      title: 'Quotation Mail Templates',
      subtitle: 'Customize outgoing email formats for Outward Sales Quotations and Service Repair Estimates.',
      editLabel: 'Edit Quotation Templates',
      saveLabel: 'Save Quotation Templates'
    },
    {
      id: 'invoices',
      label: 'Invoice',
      icon: Hash,
      title: 'Invoice Mail Templates',
      subtitle: 'Customize outgoing email formats for Official Tax Invoices and Service Invoices.',
      editLabel: 'Edit Invoice Templates',
      saveLabel: 'Save Invoice Templates'
    },
    {
      id: 'receipts',
      label: 'Receipt',
      icon: Receipt,
      title: 'Receipt Mail Templates',
      subtitle: 'Customize outgoing email formats for Outward Sales Payment Receipts and Service Handover Receipts.',
      editLabel: 'Edit Receipt Templates',
      saveLabel: 'Save Receipt Templates'
    },
    {
      id: 'auth',
      label: 'Auth Template',
      icon: ShieldCheck,
      title: 'Authentication & Credential Mail Templates',
      subtitle: 'Customize automated emails for New User Welcome/Credentials and Forgot Password OTP verification.',
      editLabel: 'Edit Auth Templates',
      saveLabel: 'Save Auth Templates'
    }
  ]

  // Track editing state per sub-tab (Quotations, Invoices, Receipts, Auth)
  const [editStates, setEditStates] = useState({
    quotations: false,
    invoices: false,
    receipts: false,
    auth: false
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // State for all 8 Templates - Strictly empty strings as initial state
  const [templates, setTemplates] = useState({
    sales_quotation_subject: '',
    sales_quotation_body: '',
    service_quotation_subject: '',
    service_quotation_body: '',
    sales_invoice_subject: '',
    sales_invoice_body: '',
    service_invoice_subject: '',
    service_invoice_body: '',
    sales_receipt_subject: '',
    sales_receipt_body: '',
    service_receipt_subject: '',
    service_receipt_body: '',
    user_invite_subject: '',
    user_invite_body: '',
    forgot_password_subject: '',
    forgot_password_body: ''
  })

  // Backup for cancel
  const [backupTemplates, setBackupTemplates] = useState({ ...templates })

  // Fetch persisted templates from database on mount
  useEffect(() => {
    let isMounted = true
    async function loadTemplates() {
      try {
        setIsLoading(true)
        const res = await fetch(API_ENDPOINTS.EMAIL_CONFIG)
        const data = await res.json()
        if (data && data.success && data.config && isMounted) {
          const cfg = data.config
          const loaded = {
            sales_quotation_subject: cfg.sales_quotation_subject || '',
            sales_quotation_body: cfg.sales_quotation_body || '',
            service_quotation_subject: cfg.service_quotation_subject || '',
            service_quotation_body: cfg.service_quotation_body || '',
            sales_invoice_subject: cfg.sales_invoice_subject || '',
            sales_invoice_body: cfg.sales_invoice_body || '',
            service_invoice_subject: cfg.service_invoice_subject || '',
            service_invoice_body: cfg.service_invoice_body || '',
            sales_receipt_subject: cfg.sales_receipt_subject || '',
            sales_receipt_body: cfg.sales_receipt_body || '',
            service_receipt_subject: cfg.service_receipt_subject || '',
            service_receipt_body: cfg.service_receipt_body || '',
            user_invite_subject: cfg.user_invite_subject || '',
            user_invite_body: cfg.user_invite_body || '',
            forgot_password_subject: cfg.forgot_password_subject || '',
            forgot_password_body: cfg.forgot_password_body || ''
          }
          setTemplates(loaded)
          setBackupTemplates(loaded)
        }
      } catch (err) {
        console.error('Failed to load email templates from API:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadTemplates()
    return () => {
      isMounted = false
    }
  }, [])

  const isCurrentEditing = !!editStates[activeSubTab]

  const handleStartEdit = (tabKey) => {
    setBackupTemplates({ ...templates })
    setEditStates(prev => ({ ...prev, [tabKey]: true }))
  }

  const handleCancelEdit = (tabKey) => {
    setTemplates({ ...backupTemplates })
    setEditStates(prev => ({ ...prev, [tabKey]: false }))
  }

  const handleSaveEdit = async (tabKey) => {
    // Required Validation: All fields in active tab must have non-empty subject and body
    const tabFieldChecks = {
      quotations: [
        { key: 'sales_quotation_subject', label: 'Sales Quotation Subject' },
        { key: 'sales_quotation_body', label: 'Sales Quotation Body' },
        { key: 'service_quotation_subject', label: 'Service Quotation Subject' },
        { key: 'service_quotation_body', label: 'Service Quotation Body' }
      ],
      invoices: [
        { key: 'sales_invoice_subject', label: 'Sales Invoice Subject' },
        { key: 'sales_invoice_body', label: 'Sales Invoice Body' },
        { key: 'service_invoice_subject', label: 'Service Invoice Subject' },
        { key: 'service_invoice_body', label: 'Service Invoice Body' }
      ],
      receipts: [
        { key: 'sales_receipt_subject', label: 'Sales Receipt Subject' },
        { key: 'sales_receipt_body', label: 'Sales Receipt Body' },
        { key: 'service_receipt_subject', label: 'Service Receipt Subject' },
        { key: 'service_receipt_body', label: 'Service Receipt Body' }
      ],
      auth: [
        { key: 'user_invite_subject', label: 'User Credentials Subject' },
        { key: 'user_invite_body', label: 'User Credentials Body' },
        { key: 'forgot_password_subject', label: 'Forgot Password Subject' },
        { key: 'forgot_password_body', label: 'Forgot Password Body' }
      ]
    }

    const missingField = (tabFieldChecks[tabKey] || []).find(
      (f) => !templates[f.key] || !templates[f.key].trim()
    )

    if (missingField) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Field Empty',
        text: `"${missingField.label}" is required. Please fill in both Subject and Body templates before saving.`,
        confirmButtonColor: '#FF8533'
      })
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch(API_ENDPOINTS.EMAIL_TEMPLATES, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(templates)
      })
      const data = await res.json()
      if (data && data.success) {
        setBackupTemplates({ ...templates })
        setEditStates(prev => ({ ...prev, [tabKey]: false }))
        const current = subMenus.find(m => m.id === tabKey)
        Swal.fire({
          icon: 'success',
          title: 'Templates Updated',
          text: `${current?.label || 'Mail'} templates saved successfully.`,
          confirmButtonColor: '#FF8533',
          timer: 1800,
          showConfirmButton: false
        })
      } else {
        throw new Error(data?.message || 'Failed to update mail templates.')
      }
    } catch (err) {
      console.error('Error saving mail templates:', err)
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Could not update templates in database.',
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = (field, val) => {
    setTemplates(prev => ({ ...prev, [field]: val }))
  }

  const currentMenu = subMenus.find(m => m.id === activeSubTab) || subMenus[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-['Poppins',sans-serif]">
      
      {/* ================= LEFT STANDALONE SIDEBAR MENU ================= */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-2 shadow-2xs space-y-1 transition-colors">
        <div className="px-3 py-2 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800/80 mb-1">
          Mail Modules
        </div>
        {subMenus.map((menu) => {
          const Icon = menu.icon
          const isActive = activeSubTab === menu.id
          const isTabEditing = !!editStates[menu.id]

          return (
            <button
              key={menu.id}
              type="button"
              onClick={() => setActiveSubTab(menu.id)}
              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold rounded-none transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FF8533] text-white font-bold shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100/70 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={isActive ? 'text-white' : 'text-[#FF8533] dark:text-blue-400'} />
                <span>{menu.label}</span>
              </div>
              {isTabEditing && (
                <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase ${
                  isActive
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}>
                  Editing
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ================= RIGHT MAIN CONTENT ================= */}
      <div className="lg:col-span-9">
        <SettingSectionCard
          icon={currentMenu.icon}
          title={currentMenu.title}
          subtitle={currentMenu.subtitle}
          actions={
            canEdit && (
              !isCurrentEditing ? (
                <button
                  type="button"
                  onClick={() => handleStartEdit(activeSubTab)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF8533] hover:bg-[#FF8533] rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit2 size={13} />
                  <span>{currentMenu.editLabel}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancelEdit(activeSubTab)}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-none cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(activeSubTab)}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#FF8533] hover:bg-[#FF8533] rounded-none transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Save size={13} />
                    <span>{isSaving ? 'Saving...' : currentMenu.saveLabel}</span>
                  </button>
                </div>
              )
            )
          }
        >
          <div className="space-y-6">

            {/* ---------------- 1. QUOTATIONS MODULE ---------------- */}
            {activeSubTab === 'quotations' && (
              <>
                {/* Sales Quotation */}
                <MailTemplateCard
                  title="Sales Quotation Email Template"
                  pillStatus="Sales Quotation"
                  subject={templates.sales_quotation_subject}
                  body={templates.sales_quotation_body}
                  availableTags={['{company_name}', '{customer_name}', '{quotation_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('sales_quotation_subject', val)}
                  onChangeBody={(val) => handleUpdate('sales_quotation_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />

                {/* Service Quotation */}
                <MailTemplateCard
                  title="Service Quotation / Estimate Email Template"
                  pillStatus="Service Estimate"
                  subject={templates.service_quotation_subject}
                  body={templates.service_quotation_body}
                  availableTags={['{company_name}', '{customer_name}', '{service_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('service_quotation_subject', val)}
                  onChangeBody={(val) => handleUpdate('service_quotation_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />
              </>
            )}

            {/* ---------------- 2. INVOICE MODULE ---------------- */}
            {activeSubTab === 'invoices' && (
              <>
                {/* Sales Tax Invoice */}
                <MailTemplateCard
                  title="Sales Tax Invoice Email Template"
                  pillStatus="Tax Invoice"
                  subject={templates.sales_invoice_subject}
                  body={templates.sales_invoice_body}
                  availableTags={['{company_name}', '{customer_name}', '{invoice_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('sales_invoice_subject', val)}
                  onChangeBody={(val) => handleUpdate('sales_invoice_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />

                {/* Service Tax Invoice */}
                <MailTemplateCard
                  title="Service Tax Invoice Email Template"
                  pillStatus="Service Invoice"
                  subject={templates.service_invoice_subject}
                  body={templates.service_invoice_body}
                  availableTags={['{company_name}', '{customer_name}', '{service_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('service_invoice_subject', val)}
                  onChangeBody={(val) => handleUpdate('service_invoice_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />
              </>
            )}

            {/* ---------------- 3. RECEIPT MODULE ---------------- */}
            {activeSubTab === 'receipts' && (
              <>
                {/* Sales Payment Receipt */}
                <MailTemplateCard
                  title="Sales Payment Receipt Email Template"
                  pillStatus="Sales Receipt"
                  subject={templates.sales_receipt_subject}
                  body={templates.sales_receipt_body}
                  availableTags={['{company_name}', '{customer_name}', '{receipt_number}', '{invoice_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('sales_receipt_subject', val)}
                  onChangeBody={(val) => handleUpdate('sales_receipt_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />

                {/* Service Payment Receipt */}
                <MailTemplateCard
                  title="Service Payment & Delivery Receipt Email Template"
                  pillStatus="Service Receipt"
                  subject={templates.service_receipt_subject}
                  body={templates.service_receipt_body}
                  availableTags={['{company_name}', '{customer_name}', '{receipt_number}', '{service_number}', '{date}', '{total_amount}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('service_receipt_subject', val)}
                  onChangeBody={(val) => handleUpdate('service_receipt_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />
              </>
            )}

            {/* ---------------- 4. AUTH TEMPLATES ---------------- */}
            {activeSubTab === 'auth' && (
              <>
                {/* User Credentials / Welcome Invite */}
                <MailTemplateCard
                  title="User Credentials / Welcome Invite Email Template"
                  pillStatus="User Credentials"
                  subject={templates.user_invite_subject}
                  body={templates.user_invite_body}
                  availableTags={['{company_name}', '{user_name}', '{email}', '{temporary_password}', '{setup_link}', '{expires_in}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('user_invite_subject', val)}
                  onChangeBody={(val) => handleUpdate('user_invite_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />

                {/* Forgot Password OTP / Reset */}
                <MailTemplateCard
                  title="Forgot Password OTP & Reset Link Email Template"
                  pillStatus="Forgot Password"
                  subject={templates.forgot_password_subject}
                  body={templates.forgot_password_body}
                  availableTags={['{company_name}', '{user_name}', '{email}', '{otp_code}', '{expires_in}']}
                  isEditing={isCurrentEditing}
                  onChangeSubject={(val) => handleUpdate('forgot_password_subject', val)}
                  onChangeBody={(val) => handleUpdate('forgot_password_body', val)}
                  maxSubjectChars={50}
                  maxBodyChars={250}
                />
              </>
            )}

          </div>
        </SettingSectionCard>
      </div>

    </div>
  )
}
