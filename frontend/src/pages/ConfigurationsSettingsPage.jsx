import React, { useState, useEffect } from 'react'
import {
  SlidersHorizontal,
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Server,
  AtSign,
  User,
  Info,
  X,
  Cloud,
  Folder,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sparkles,
  Bot,
  Cpu
} from '../components/common/icons'
import Swal from 'sweetalert2'
import { API_ENDPOINTS, getAuthHeaders } from '../config/api'
import { getUserPermissions } from '../utils/access'
import ArrowNavTabs from '../components/common/ArrowNavTabs'
import StatusPill from '../components/ui/StatusPill'

export default function ConfigurationsSettingsPage() {
  const { can, hasAny, hasFullAccess } = getUserPermissions()
  const simchaUser = JSON.parse(localStorage.getItem('simcha_user') || sessionStorage.getItem('simcha_user') || '{}')
  const userPerms = simchaUser.permissions || {}

  const hasTabMail = can('tab_config_mail', 'View')
  const hasTabCloudinary = can('tab_config_cloudinary', 'View')
  const hasTabAi = can('tab_config_ai', 'View')

  const canEditMail = can('tab_config_mail', 'Edit')
  const canEditCloudinary = can('tab_config_cloudinary', 'Edit')
  const canEditAi = can('tab_config_ai', 'Edit')

  const [activeTab, setActiveTab] = useState(() => {
    if (hasTabMail) return 'mail'
    if (hasTabCloudinary) return 'cloudinary'
    if (hasTabAi) return 'ai'
    return 'mail'
  })

  useEffect(() => {
    if (activeTab === 'mail' && !hasTabMail) {
      if (hasTabCloudinary) setActiveTab('cloudinary')
      else if (hasTabAi) setActiveTab('ai')
    } else if (activeTab === 'cloudinary' && !hasTabCloudinary) {
      if (hasTabMail) setActiveTab('mail')
      else if (hasTabAi) setActiveTab('ai')
    } else if (activeTab === 'ai' && !hasTabAi) {
      if (hasTabMail) setActiveTab('mail')
      else if (hasTabCloudinary) setActiveTab('cloudinary')
    }
  }, [hasTabMail, hasTabCloudinary, hasTabAi, activeTab])
  const [isLoading, setIsLoading] = useState(true)

  // Mail Section States
  const [isSavingSmtp, setIsSavingSmtp] = useState(false)
  const [isSavingRecipient, setIsSavingRecipient] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [isEditingSmtp, setIsEditingSmtp] = useState(false)
  const [isEditingRecipient, setIsEditingRecipient] = useState(false)

  const [mailFormData, setMailFormData] = useState({
    smtp_host: '',
    smtp_port: '',
    smtp_secure: true,
    smtp_user: '',
    smtp_pass: '',
    sender_name: '',
    recipient_email: '',
    auto_email_on_create: true,
    email_customer_copy: true,
    email_subject: '',
    email_body: '',
    user_invite_subject: '',
    user_invite_body: ''
  })
  const [originalMailData, setOriginalMailData] = useState({ ...mailFormData })

  // Cloudinary Section States
  const [isSavingCloudinary, setIsSavingCloudinary] = useState(false)
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false)
  const [isEditingCloudinary, setIsEditingCloudinary] = useState(false)
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false)

  const [cloudinaryFormData, setCloudinaryFormData] = useState({
    cloud_name: '',
    api_key: '',
    api_secret: '',
    folder_name: '',
    is_enabled: true
  })
  const [originalCloudinaryData, setOriginalCloudinaryData] = useState({ ...cloudinaryFormData })

  // Virtual Assistant AI Section States
  const [isSavingAi, setIsSavingAi] = useState(false)
  const [isTestingAi, setIsTestingAi] = useState(false)
  const [isEditingAi, setIsEditingAi] = useState(false)
  const [showAiKey, setShowAiKey] = useState(false)

  const [aiFormData, setAiFormData] = useState({
    is_enabled: true,
    provider: 'groq',
    key_name: '',
    model_name: 'llama-3.3-70b-versatile',
    groq_api_key: '',
    masked_api_key: '',
    api_key_configured: false
  })
  const [originalAiData, setOriginalAiData] = useState({ ...aiFormData })

  // Fetch configs on mount
  useEffect(() => {
    const fetchAllConfigs = async () => {
      try {
        setIsLoading(true)
        const [emailRes, cloudRes, aiRes] = await Promise.all([
          fetch(API_ENDPOINTS.EMAIL_CONFIG, { headers: getAuthHeaders() }),
          fetch(API_ENDPOINTS.CLOUDINARY_CONFIG, { headers: getAuthHeaders() }),
          fetch(API_ENDPOINTS.AI_CONFIG, { headers: getAuthHeaders() })
        ])

        const emailData = await emailRes.json()
        const cloudData = await cloudRes.json()
        const aiData = await aiRes.json()

        if (emailData.success && emailData.config) {
          const loadedMail = {
            smtp_host: emailData.config.smtp_host || '',
            smtp_port: emailData.config.smtp_port || '',
            smtp_secure: Boolean(emailData.config.smtp_secure),
            smtp_user: emailData.config.smtp_user || '',
            smtp_pass: emailData.config.smtp_pass || '',
            sender_name: emailData.config.sender_name || '',
            recipient_email: emailData.config.recipient_email || emailData.config.smtp_user || '',
            auto_email_on_create: emailData.config.auto_email_on_create !== undefined ? Boolean(emailData.config.auto_email_on_create) : true,
            email_customer_copy: emailData.config.email_customer_copy !== undefined ? Boolean(emailData.config.email_customer_copy) : true,
            email_subject: emailData.config.email_subject || '',
            email_body: emailData.config.email_body || '',
            user_invite_subject: emailData.config.user_invite_subject || 'Welcome to {company_name} - Account & Password Setup',
            user_invite_body: emailData.config.user_invite_body || 'Your user account has been created for {company_name} Billing & Inventory System. You can log in with your temporary password or set your custom password using the secure link below:'
          }
          setMailFormData(loadedMail)
          setOriginalMailData(loadedMail)
        }

        if (cloudData.success && cloudData.config) {
          const loadedCloud = {
            cloud_name: cloudData.config.cloud_name || '',
            api_key: cloudData.config.api_key || '',
            api_secret: cloudData.config.api_secret || '',
            folder_name: cloudData.config.folder_name || '',
            is_enabled: cloudData.config.is_enabled !== undefined ? Boolean(cloudData.config.is_enabled) : true
          }
          setCloudinaryFormData(loadedCloud)
          setOriginalCloudinaryData(loadedCloud)
        }

        if (aiData.success && aiData.config) {
          const loadedAi = {
            is_enabled: aiData.config.is_enabled !== undefined ? Boolean(aiData.config.is_enabled) : true,
            provider: aiData.config.provider || 'groq',
            key_name: aiData.config.key_name || '',
            model_name: aiData.config.model_name || 'llama-3.3-70b-versatile',
            groq_api_key: '',
            masked_api_key: aiData.config.masked_api_key || '',
            api_key_configured: Boolean(aiData.config.api_key_configured)
          }
          setAiFormData(loadedAi)
          setOriginalAiData(loadedAi)
        }
      } catch (err) {
        console.error('Failed to load configurations:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllConfigs()
  }, [])

  // ==================== VIRTUAL ASSISTANT HANDLERS ====================
  const handleAiChange = (field, value) => {
    setAiFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleAiEnabled = async (checked) => {
    const updated = { ...aiFormData, is_enabled: checked }
    setAiFormData(updated)
    try {
      const res = await fetch(API_ENDPOINTS.AI_CONFIG, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      const data = await res.json()
      if (data.success) {
        setOriginalAiData(updated)
        window.dispatchEvent(new CustomEvent('ai_config_updated', { detail: updated }))
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true
        }).fire({
          icon: 'success',
          title: `Virtual Assistant ${checked ? 'Enabled' : 'Disabled'}`
        })
      }
    } catch (err) {
      console.error('Failed to toggle AI assistant:', err)
    }
  }

  const handleTestAiConnection = async () => {
    setIsTestingAi(true)
    try {
      const res = await fetch(API_ENDPOINTS.AI_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groq_api_key: aiFormData.groq_api_key || undefined,
          model_name: aiFormData.model_name
        })
      })
      const data = await res.json()
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Connection Successful!',
          text: 'Groq Cloud API credentials verified. Virtual Assistant is ready.',
          confirmButtonColor: '#FF8533'
        })
      } else {
        throw new Error(data.message || 'Connection test failed.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Failed',
        text: err.message || 'Unable to connect to Groq API. Please check your key.',
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsTestingAi(false)
    }
  }

  const handleSaveAi = async () => {
    setIsSavingAi(true)
    try {
      const res = await fetch(API_ENDPOINTS.AI_CONFIG, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiFormData)
      })
      const data = await res.json()
      if (data.success && data.config) {
        setAiFormData(prev => ({
          ...prev,
          groq_api_key: '',
          key_name: data.config.key_name !== undefined ? data.config.key_name : prev.key_name,
          masked_api_key: data.config.masked_api_key,
          api_key_configured: data.config.api_key_configured,
          is_enabled: data.config.is_enabled,
          model_name: data.config.model_name
        }))
        setOriginalAiData({
          ...aiFormData,
          key_name: data.config.key_name !== undefined ? data.config.key_name : aiFormData.key_name,
          groq_api_key: '',
          masked_api_key: data.config.masked_api_key,
          api_key_configured: data.config.api_key_configured
        })
        setIsEditingAi(false)
        window.dispatchEvent(new CustomEvent('ai_config_updated', { detail: data.config }))
        Swal.fire({
          icon: 'success',
          title: 'Virtual Assistant Saved',
          text: 'AI settings and credentials updated securely with AES-256 encryption.',
          confirmButtonColor: '#FF8533'
        })
      } else {
        throw new Error(data.message || 'Failed to save configuration.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsSavingAi(false)
    }
  }

  const handleCancelAi = () => {
    setAiFormData({ ...originalAiData, groq_api_key: '' })
    setIsEditingAi(false)
  }

  // ==================== MAIL HANDLERS ====================
  const handleMailChange = (field, value) => {
    setMailFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleAutoEmail = async (checked) => {
    const updated = { ...mailFormData, auto_email_on_create: checked }
    setMailFormData(updated)
    try {
      await fetch(API_ENDPOINTS.EMAIL_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      setOriginalMailData(updated)
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      }).fire({
        icon: 'success',
        title: checked ? 'Auto Email Dispatch Enabled' : 'Auto Email Dispatch Disabled'
      })
    } catch (err) {
      console.error('Failed to update toggle:', err)
    }
  }

  const handleToggleCustomerCopy = async (checked) => {
    const updated = { ...mailFormData, email_customer_copy: checked }
    setMailFormData(updated)
    try {
      await fetch(API_ENDPOINTS.EMAIL_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      setOriginalMailData(updated)
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      }).fire({
        icon: 'success',
        title: checked ? 'Customer Email Dispatch Enabled' : 'Customer Email Dispatch Disabled'
      })
    } catch (err) {
      console.error('Failed to update customer copy toggle:', err)
    }
  }

  const handleSaveSmtp = async (e) => {
    if (e) e.preventDefault()
    try {
      setIsSavingSmtp(true)
      const res = await fetch(API_ENDPOINTS.EMAIL_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailFormData)
      })
      const data = await res.json()

      if (data.success) {
        setOriginalMailData({ ...mailFormData })
        setIsEditingSmtp(false)
        Swal.fire({
          icon: 'success',
          title: 'SMTP Settings Saved',
          text: 'Outgoing SMTP server configurations updated successfully.',
          confirmButtonColor: '#FF8533',
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        throw new Error(data.message || 'Failed to save SMTP settings.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsSavingSmtp(false)
    }
  }

  const handleCancelSmtp = () => {
    setMailFormData(prev => ({
      ...prev,
      smtp_host: originalMailData.smtp_host,
      smtp_port: originalMailData.smtp_port,
      smtp_secure: originalMailData.smtp_secure,
      smtp_user: originalMailData.smtp_user,
      smtp_pass: originalMailData.smtp_pass,
      sender_name: originalMailData.sender_name,
      recipient_email: originalMailData.recipient_email
    }))
    setIsEditingSmtp(false)
  }

  const handleSaveRecipient = async (e) => {
    if (e) e.preventDefault()
    try {
      setIsSavingRecipient(true)
      const res = await fetch(API_ENDPOINTS.EMAIL_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailFormData)
      })
      const data = await res.json()

      if (data.success) {
        setOriginalMailData({ ...mailFormData })
        setIsEditingRecipient(false)
        Swal.fire({
          icon: 'success',
          title: 'Email Templates Saved',
          text: 'Email Subject and Message Template updated successfully.',
          confirmButtonColor: '#FF8533',
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        throw new Error(data.message || 'Failed to save recipient settings.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsSavingRecipient(false)
    }
  }

  const handleCancelRecipient = () => {
    setMailFormData(prev => ({
      ...prev,
      recipient_email: originalMailData.recipient_email,
      email_subject: originalMailData.email_subject,
      email_body: originalMailData.email_body,
      user_invite_subject: originalMailData.user_invite_subject,
      user_invite_body: originalMailData.user_invite_body
    }))
    setIsEditingRecipient(false)
  }

  const handleTestEmail = async () => {
    if (!mailFormData.smtp_user || !mailFormData.smtp_pass) {
      Swal.fire({
        icon: 'warning',
        title: 'Credentials Required',
        text: 'Please enter SMTP Email and App Password to test connection.',
        confirmButtonColor: '#FF8533'
      })
      return
    }

    try {
      setIsTesting(true)
      Swal.fire({
        title: 'Testing SMTP Connection...',
        text: `Sending sample dispatch test to ${mailFormData.recipient_email || mailFormData.smtp_user}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      })

      const res = await fetch(API_ENDPOINTS.EMAIL_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mailFormData,
          test_recipient: mailFormData.recipient_email || mailFormData.smtp_user
        })
      })

      const data = await res.json()
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'SMTP Connected & Verified!',
          html: `<p class="text-sm text-gray-600 dark:text-slate-300">Test email successfully sent to <b>${mailFormData.recipient_email || mailFormData.smtp_user}</b>.</p>`,
          confirmButtonColor: '#FF8533'
        })
      } else {
        throw new Error(data.message || 'SMTP Authentication failed.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'SMTP Connection Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsTesting(false)
    }
  }

  // ==================== CLOUDINARY HANDLERS ====================
  const handleCloudinaryChange = (field, value) => {
    setCloudinaryFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleToggleCloudinary = async (checked) => {
    const updated = { ...cloudinaryFormData, is_enabled: checked }
    setCloudinaryFormData(updated)
    try {
      await fetch(API_ENDPOINTS.CLOUDINARY_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      setOriginalCloudinaryData(updated)
      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      }).fire({
        icon: 'success',
        title: checked ? 'Cloudinary Media Storage Enabled' : 'Cloudinary Media Storage Disabled'
      })
    } catch (err) {
      console.error('Failed to update Cloudinary toggle:', err)
    }
  }

  const handleSaveCloudinary = async (e) => {
    if (e) e.preventDefault()
    try {
      setIsSavingCloudinary(true)
      const res = await fetch(API_ENDPOINTS.CLOUDINARY_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudinaryFormData)
      })
      const data = await res.json()

      if (data.success) {
        setOriginalCloudinaryData({ ...cloudinaryFormData })
        setIsEditingCloudinary(false)
        Swal.fire({
          icon: 'success',
          title: 'Cloudinary Configuration Saved',
          text: 'Cloudinary API credentials & upload folder saved successfully.',
          confirmButtonColor: '#FF8533',
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        throw new Error(data.message || 'Failed to save Cloudinary configurations.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsSavingCloudinary(false)
    }
  }

  const handleCancelCloudinary = () => {
    setCloudinaryFormData({ ...originalCloudinaryData })
    setIsEditingCloudinary(false)
  }

  const handleTestCloudinary = async () => {
    if (!cloudinaryFormData.cloud_name || !cloudinaryFormData.api_key || !cloudinaryFormData.api_secret) {
      Swal.fire({
        icon: 'warning',
        title: 'Credentials Required',
        text: 'Please enter Cloud Name, API Key, and API Secret to test connection.',
        confirmButtonColor: '#FF8533'
      })
      return
    }

    try {
      setIsTestingCloudinary(true)
      Swal.fire({
        title: 'Testing Cloudinary Connection...',
        text: `Connecting to Cloudinary cloud "${cloudinaryFormData.cloud_name}"...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      })

      const res = await fetch(API_ENDPOINTS.CLOUDINARY_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudinaryFormData)
      })

      const data = await res.json()
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Cloudinary Connected & Verified!',
          html: `<p class="text-sm text-gray-600 dark:text-slate-300">Successfully verified account <b>"${cloudinaryFormData.cloud_name}"</b>. Billing media will be securely stored and served via Cloudinary CDN.</p>`,
          confirmButtonColor: '#FF8533'
        })
      } else {
        throw new Error(data.message || 'Cloudinary verification failed.')
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cloudinary Verification Failed',
        text: err.message,
        confirmButtonColor: '#FF8533'
      })
    } finally {
      setIsTestingCloudinary(false)
    }
  }

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 space-y-6 pb-16 font-['Poppins',sans-serif]">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/80 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#292424] dark:text-white uppercase flex items-center gap-2.5">
            <SlidersHorizontal className="text-[#FF8533] dark:text-blue-400" size={22} />
            <span>CONFIGURATIONS SETTINGS</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Manage outgoing SMTP mail server and Cloudinary cloud media storage credentials.
          </p>
        </div>

        {/* Tab Action Quick Action */}
        <div className="flex items-center gap-2">
          {activeTab === 'mail' && (
            <button
              onClick={handleTestEmail}
              disabled={isTesting || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF8533] hover:bg-[#032b6d] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{isTesting ? 'Testing...' : 'Send Test Email'}</span>
            </button>
          )}

          {activeTab === 'cloudinary' && (
            <button
              onClick={handleTestCloudinary}
              disabled={isTestingCloudinary || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF8533] hover:bg-[#032b6d] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} />
              <span>{isTestingCloudinary ? 'Testing...' : 'Test Cloudinary Connection'}</span>
            </button>
          )}

          {activeTab === 'ai' && (
            <button
              onClick={handleTestAiConnection}
              disabled={isTestingAi || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF8533] hover:bg-[#032b6d] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} />
              <span>{isTestingAi ? 'Testing...' : 'Test AI Connection'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Tab Navigation Strip */}
      <ArrowNavTabs
        tabs={[
          ...(hasTabMail ? [{ id: 'mail', label: 'Mail Settings', icon: Mail }] : []),
          ...(hasTabCloudinary ? [{ id: 'cloudinary', label: 'Cloudinary Configurations', icon: Cloud }] : []),
          ...(hasTabAi ? [{ id: 'ai', label: 'Activate Virtual Assistant', icon: Bot }] : [])
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ========================================================= */}
      {/* TAB 1: MAIL SETTINGS                                     */}
      {/* ========================================================= */}
      {activeTab === 'mail' && hasTabMail && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Auto-Dispatch Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-none border border-blue-100 dark:border-blue-800/40">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#292424] dark:text-white">Auto-Dispatch on Bill Generation</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                    When enabled, saving a bill (or shortcut <code className="text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1 py-0.5 border border-blue-100 dark:border-blue-900/50">CTRL + ENTER</code>) automatically creates and sends the invoice PDF to the admin/accountant recipient.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Status:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailFormData.auto_email_on_create}
                    onChange={(e) => handleToggleAutoEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-[#FF8533] dark:peer-checked:bg-blue-600"></div>
                  <span className="ml-2.5 text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                    {mailFormData.auto_email_on_create ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {/* Customer Copy Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-none border border-emerald-100 dark:border-emerald-800/40">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#292424] dark:text-white">Send Copy to Customer Email</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                    When enabled, if customer email is provided in Outward, the invoice PDF is automatically emailed directly to the customer as well.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Customer Copy:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailFormData.email_customer_copy}
                    onChange={(e) => handleToggleCustomerCopy(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-500"></div>
                  <span className="ml-2.5 text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                    {mailFormData.email_customer_copy ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* SMTP Mail Server Settings (Full Width) */}
          <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Server size={18} className="text-[#FF8533] dark:text-blue-400" />
                <div>
                  <h2 className="text-sm font-bold text-[#292424] dark:text-white uppercase tracking-wide">
                    SMTP Mail Server Settings
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">
                    Configure outgoing sender email, app password & destination recipient
                  </p>
                </div>
              </div>

              {canEditMail && isEditingSmtp && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSmtp}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSmtp}
                    disabled={isSavingSmtp}
                    className="px-3 py-1 text-xs font-bold text-white bg-[#FF8533] hover:bg-[#FF8533] rounded-none transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save size={12} />
                    <span>{isSavingSmtp ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Sender Email ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 dark:text-slate-300">
                    Sender Email ID (From Mail / SMTP User) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-gray-400 dark:text-slate-500">Email address used for sending</span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    disabled={!isEditingSmtp}
                    value={mailFormData.smtp_user}
                    onChange={(e) => handleMailChange('smtp_user', e.target.value)}
                    placeholder="Enter sender email address"
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none transition-all ${
                      isEditingSmtp
                        ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500'
                        : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Email App Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 dark:text-slate-300">
                    Email App Password / SMTP Password <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-blue-600 dark:text-blue-400 font-medium">16-Digit Google App Password</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    disabled={!isEditingSmtp}
                    value={mailFormData.smtp_pass}
                    onChange={(e) => handleMailChange('smtp_pass', e.target.value)}
                    placeholder="••••••••••••••••"
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none font-mono transition-all ${
                      isEditingSmtp
                        ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500'
                        : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Recipient Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 dark:text-slate-300">
                    Send Invoice Copy To (Recipient Email) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-gray-400 dark:text-slate-500">Destination address for invoice copy</span>
                </div>
                <input
                  type="email"
                  disabled={!isEditingSmtp}
                  value={mailFormData.recipient_email}
                  onChange={(e) => handleMailChange('recipient_email', e.target.value)}
                  placeholder="Enter recipient email address"
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none transition-all ${
                    isEditingSmtp
                      ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500'
                      : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Sender Display Name */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Sender Display Name (From Name)
                </label>
                <input
                  type="text"
                  disabled={!isEditingSmtp}
                  value={mailFormData.sender_name}
                  onChange={(e) => handleMailChange('sender_name', e.target.value)}
                  placeholder="Enter sender display name"
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none transition-all ${
                    isEditingSmtp
                      ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-[#FF8533] dark:focus:border-blue-500'
                      : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Host Server */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  disabled={!isEditingSmtp}
                  value={mailFormData.smtp_host}
                  onChange={(e) => handleMailChange('smtp_host', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 text-gray-600 dark:text-slate-400 rounded-none disabled:cursor-not-allowed"
                />
              </div>

              {/* Port & Protocol */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">
                  SMTP Port & Protocol
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    disabled={!isEditingSmtp}
                    value={mailFormData.smtp_port}
                    onChange={(e) => handleMailChange('smtp_port', e.target.value)}
                    className="w-24 px-3.5 py-2.5 text-xs border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 text-gray-600 dark:text-slate-400 rounded-none disabled:cursor-not-allowed"
                  />
                  <select
                    disabled={!isEditingSmtp}
                    value={mailFormData.smtp_secure ? 'true' : 'false'}
                    onChange={(e) => handleMailChange('smtp_secure', e.target.value === 'true')}
                    className="flex-1 px-3.5 py-2.5 text-xs border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 text-gray-600 dark:text-slate-400 rounded-none disabled:cursor-not-allowed"
                  >
                    <option value="true">SSL (Port 465)</option>
                    <option value="false">TLS / STARTTLS (Port 587)</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CLOUDINARY CONFIGURATIONS                         */}
      {/* ========================================================= */}
      {activeTab === 'cloudinary' && hasTabCloudinary && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Quick Cloudinary Status Banner Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-none border border-sky-100 dark:border-sky-800/40">
                <Cloud size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#292424] dark:text-white">Cloudinary Cloud Media Storage</h3>
                  {cloudinaryFormData.cloud_name ? (
                    <StatusPill
                      status={cloudinaryFormData.is_enabled ? 'Active' : 'Inactive'}
                      size="sm"
                    />
                  ) : (
                    <StatusPill status="Pending" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Store hardcopy inward bills, invoices, and bank QR codes in Cloudinary cloud.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800 justify-between sm:justify-end">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Upload Feature:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudinaryFormData.is_enabled}
                  onChange={(e) => handleToggleCloudinary(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-sky-600 dark:peer-checked:bg-sky-500"></div>
                <span className="ml-2.5 text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                  {cloudinaryFormData.is_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* Cloudinary Credentials Form Card (Clean & Full Width) */}
          <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Key size={18} className="text-sky-600 dark:text-sky-400" />
                <div>
                  <h2 className="text-sm font-bold text-[#292424] dark:text-white uppercase tracking-wide">
                    Cloudinary API Credentials
                  </h2>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">
                    Manage dynamic API keys for automated media uploads
                  </p>
                </div>
              </div>

              {isEditingCloudinary ? (
                <span className="text-xs px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold">
                  Editing Mode Active
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Cloud Name */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Cloud Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditingCloudinary}
                  value={cloudinaryFormData.cloud_name}
                  onChange={(e) => handleCloudinaryChange('cloud_name', e.target.value)}
                  placeholder="Enter Cloud Name"
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none transition-all ${
                    isEditingCloudinary
                      ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-sky-500'
                      : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  disabled={!isEditingCloudinary}
                  value={cloudinaryFormData.api_key}
                  onChange={(e) => handleCloudinaryChange('api_key', e.target.value)}
                  placeholder="••••••••••••••••"
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none font-mono transition-all ${
                    isEditingCloudinary
                      ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-sky-500'
                      : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                  }`}
                />
              </div>

              {/* API Secret */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  API Secret <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    disabled={!isEditingCloudinary}
                    value={cloudinaryFormData.api_secret}
                    onChange={(e) => handleCloudinaryChange('api_secret', e.target.value)}
                    placeholder="••••••••••••••••"
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none font-mono transition-all ${
                      isEditingCloudinary
                        ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-sky-500'
                        : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Default Upload Folder */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Upload Root Folder
                </label>
                <div className="relative">
                  <Folder size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    disabled={!isEditingCloudinary}
                    value={cloudinaryFormData.folder_name}
                    onChange={(e) => handleCloudinaryChange('folder_name', e.target.value)}
                    placeholder="Enter root folder name"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-none transition-all ${
                      isEditingCloudinary
                        ? 'text-[#292424] dark:text-white bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-sky-500'
                        : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

            </div>

            {/* Bottom Action Controls: Save, Cancel, Test Connection */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={handleTestCloudinary}
                  disabled={isTestingCloudinary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF8533] hover:bg-[#032b6d] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap size={14} />
                  <span>{isTestingCloudinary ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {canEditCloudinary && isEditingCloudinary && (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelCloudinary}
                      className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer border border-gray-300 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCloudinary}
                      disabled={isSavingCloudinary}
                      className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-none transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save size={13} />
                      <span>{isSavingCloudinary ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: VIRTUAL ASSISTANT (SIMCHA AI) SETTINGS             */}
      {/* ========================================================= */}
      {activeTab === 'ai' && hasTabAi && (
        <div className="space-y-6 animate-in fade-in duration-200 font-['Poppins',sans-serif]">

          {/* Quick Status & Master Activation Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-none border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-none border border-blue-100 dark:border-blue-800/40">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#292424] dark:text-white flex items-center gap-2">
                  Activate Virtual Assistant
                  <StatusPill status={aiFormData.is_enabled ? 'Active' : 'Inactive'} size="sm" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                  When enabled, the floating{' '}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open_simcha_ai'))}
                    className="font-bold text-slate-900 dark:text-white underline underline-offset-2 cursor-pointer inline"
                    title="Click to open Simcha AI Assistant"
                  >
                    Ask Simcha AI
                  </button>{' '}
                  assistant button is visible globally across all billing pages to assist with sales summaries, stock checks, pending invoices, user guides, and verified HSN/GST lookups.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Virtual Assistant Status:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiFormData.is_enabled}
                  onChange={(e) => handleToggleAiEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#FF8533]"></div>
                <span className="ml-3 text-xs font-bold text-slate-900 dark:text-white">
                  {aiFormData.is_enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </label>
            </div>
          </div>

          {/* AI Credentials & Model Configuration Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-none border border-gray-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Cpu size={18} className="text-[#FF8533] dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#292424] dark:text-white uppercase tracking-wider">
                  Groq Cloud Credentials &amp; Model Setup
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={12} />
                <span>AES-256 Encrypted</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* AI Provider */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase">
                  AI Provider
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value="Groq Cloud (Ultra-Fast LPU Inference)"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-medium rounded-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Key Name / Account Label */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase">
                  Key Name / Account Identifier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isEditingAi}
                    value={aiFormData.key_name || ''}
                    onChange={(e) => handleAiChange('key_name', e.target.value)}
                    placeholder={isEditingAi ? "e.g. Primary Account, Personal Groq, Work Key" : (aiFormData.key_name || "No key name set")}
                    className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-none transition-colors ${
                      isEditingAi
                        ? 'bg-white dark:bg-slate-900 border border-[#FF8533] dark:border-blue-500 text-gray-900 dark:text-white focus:outline-none'
                        : 'bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 uppercase">
                  Model Selection
                </label>
                <select
                  disabled={!isEditingAi}
                  value={aiFormData.model_name}
                  onChange={(e) => handleAiChange('model_name', e.target.value)}
                  className={`w-full px-3.5 py-2.5 border text-xs font-medium rounded-none transition-colors ${
                    isEditingAi
                      ? 'bg-white dark:bg-slate-900 border-[#FF8533] dark:border-blue-500 text-gray-900 dark:text-white'
                      : 'bg-gray-50 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <option value="openai/gpt-oss-120b">GPT-OSS 120B (High Accuracy)</option>
                  <option value="openai/gpt-oss-20b">GPT-OSS 20B (Fast & Balanced)</option>
                  <option value="qwen/qwen3.8-27b">Qwen 3.8 27B (Ultra-Fast)</option>
                </select>
              </div>

              {/* Groq API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                    Groq API Key <span className="text-red-500">*</span>
                  </label>
                  {aiFormData.api_key_configured && !isEditingAi && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Configured
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="password"
                    disabled={!isEditingAi}
                    value={isEditingAi ? aiFormData.groq_api_key : (aiFormData.api_key_configured ? '••••••••••••••••••••' : (aiFormData.masked_api_key || ''))}
                    onChange={(e) => handleAiChange('groq_api_key', e.target.value)}
                    placeholder="••••••••••••••••"
                    className={`w-full px-3.5 py-2.5 border text-xs font-medium rounded-none font-mono transition-colors ${
                      isEditingAi
                        ? 'bg-white dark:bg-slate-900 border-[#FF8533] dark:border-blue-500 text-gray-900 dark:text-white'
                        : 'bg-gray-50 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Encrypted Note */}
              <div className="md:col-span-2">
                <p className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                  <Info size={12} />
                  Your API key is securely encrypted on the server before storage and never returned in plain text.
                </p>
              </div>

            </div>

            {/* Bottom Action Controls: Save, Cancel, Test Connection */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF8533] hover:bg-[#032b6d] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-none shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap size={14} />
                  <span>{isTestingAi ? 'Testing...' : 'Test AI Connection'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {canEditAi && isEditingAi && (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelAi}
                      className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-none transition-colors cursor-pointer border border-gray-300 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAi}
                      disabled={isSavingAi}
                      className="px-5 py-2 text-xs font-bold text-white bg-[#FF8533] hover:bg-[#FF8533] rounded-none transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save size={13} />
                      <span>{isSavingAi ? 'Saving...' : 'Save Configuration'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
