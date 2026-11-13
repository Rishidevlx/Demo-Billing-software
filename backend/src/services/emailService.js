import puppeteer from 'puppeteer'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPool } from '../config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Locate system Chrome, Edge or Chromium executable if available
function getChromeExecutablePath() {
  const possiblePaths = [
    // Environment variables (Standard on Docker, Render, Railway, AWS, Heroku)
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\rishi\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Linux paths (Ubuntu, Debian, Alpine, Cloud VMs, Render, Heroku)
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/lib/chromium/chromium',
    '/usr/lib/chromium-browser/chromium-browser',
    '/opt/google/chrome/google-chrome',
    // macOS paths
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ].filter(Boolean)

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}

/**
 * Universal Puppeteer Browser Launcher
 * Works across Local Windows/Mac development and Cloud Linux deployments (Render, Railway, Docker, etc.)
 */
async function launchPuppeteerBrowser() {
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--no-zygote',
    '--font-render-hinting=none',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--blink-settings=imagesEnabled=true'
  ]

  // 1. Try launching with system / env executable path if located
  const systemChromePath = getChromeExecutablePath()
  if (systemChromePath) {
    try {
      return await puppeteer.launch({
        executablePath: systemChromePath,
        headless: 'new',
        args: launchArgs
      })
    } catch (sysErr) {
      console.warn(`[Puppeteer] Failed launching with system path "${systemChromePath}":`, sysErr.message)
    }
  }

  // 2. Try launching with Puppeteer's default bundled Chromium
  try {
    return await puppeteer.launch({
      headless: 'new',
      args: launchArgs
    })
  } catch (bundledErr) {
    console.error('[Puppeteer] Failed launching bundled Chromium:', bundledErr.message)
    throw new Error(`Chrome/Chromium executable not found on server to render PDF. Please ensure Chrome or Puppeteer Chromium is installed on the hosting server. (Details: ${bundledErr.message})`)
  }
}

// Convert image file to base64 data URI
function getBase64Image(relativePath) {
  try {
    const fullPath = path.resolve(__dirname, relativePath)
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
      const data = fs.readFileSync(fullPath).toString('base64')
      return `data:${mime};base64,${data}`
    }
  } catch (e) {
    console.error('Error reading asset:', relativePath, e)
  }
  return ''
}

/**
 * Render Template Text by replacing variable placeholders like {company_name}, {invoice_number}, etc.
 * Returns empty string if template is missing/null/empty (NO default hardcoded fallbacks).
 */
export function renderTemplateText(templateStr, vars = {}) {
  if (!templateStr || typeof templateStr !== 'string') return ''
  let text = templateStr
  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi')
    text = text.replace(regex, val !== undefined && val !== null ? String(val) : '')
  }
  return text
}

/**
 * Resolve Brand Logo from Theme Settings.
 * Returns the exact logo string (Base64 data URI or hosted http/https URL) uploaded in Theme Settings.
 * Returns empty string if no Brand Logo is uploaded (Strict zero fallback).
 */
export function resolveBrandLogo(companySettings = {}) {
  let url = companySettings.logo_url
  if (!url && companySettings.theme_config) {
    try {
      const parsed = typeof companySettings.theme_config === 'string'
        ? JSON.parse(companySettings.theme_config)
        : companySettings.theme_config
      url = parsed?.logoUrl || parsed?.logo_url || ''
    } catch {}
  }
  return typeof url === 'string' ? url.trim() : ''
}

/**
 * Helper to get inline logo attachment for email clients
 * If Brand Logo is a Base64 Data URI uploaded in Theme Settings, attaches as inline CID.
 * If Brand Logo is not uploaded, returns null (NO fallback to default/local assets).
 */
export function getLogoAttachment(companySettings = {}) {
  const brandLogo = resolveBrandLogo(companySettings)
  if (!brandLogo) return null

  // If user uploaded a Base64 image in Theme Settings
  if (brandLogo.startsWith('data:image/')) {
    const matches = brandLogo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (matches && matches.length === 3) {
      const mimeType = matches[1]
      const buffer = Buffer.from(matches[2], 'base64')
      const ext = mimeType.includes('svg') ? 'svg' : mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
      return {
        filename: `brand-logo.${ext}`,
        content: buffer,
        contentType: mimeType,
        cid: 'simcha_brand_logo'
      }
    }
  }

  // External hosted URL (http/https) doesn't need inline attachment
  return null
}

/**
 * Simple & Neat Card Email Layout Container
 * Displays Header with Brand Logo (from Theme Settings) & Company Name,
 * clean Card with dynamic body text, and Footer with company details.
 * If no Brand Logo is uploaded in Theme Settings, logo is completely omitted (NO fallback).
 */
export function buildBrandedEmailHtml(bodyText, companySettings = {}) {
  if (!bodyText || !bodyText.trim()) return ''

  const companyName = companySettings.company_name || 'SIMCHA INFO SOLUTIONS'
  const companyPhone = companySettings.phone || ''
  const companyEmail = companySettings.email || ''
  const companyAddress = companySettings.address || ''
  const brandLogo = resolveBrandLogo(companySettings)

  let logoHtml = ''
  if (brandLogo) {
    if (brandLogo.startsWith('data:image/')) {
      logoHtml = `
        <td style="vertical-align: middle; padding-right: 14px;">
          <img src="cid:simcha_brand_logo" alt="Logo" style="height: 38px; width: auto; max-width: 130px; object-fit: contain; display: block; border: 0;" />
        </td>
      `
    } else if (/^https?:\/\//i.test(brandLogo)) {
      logoHtml = `
        <td style="vertical-align: middle; padding-right: 14px;">
          <img src="${brandLogo}" alt="Logo" style="height: 38px; width: auto; max-width: 130px; object-fit: contain; display: block; border: 0;" />
        </td>
      `
    }
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 28px 12px; margin: 0; width: 100%; box-sizing: border-box;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
        
        <!-- Header: Navy Blue Brand Banner with Brand Logo & Company Name (NO SUBTITLE, NO FALLBACK LOGO) -->
        <div style="background-color: #111827; padding: 18px 24px; text-align: left;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              ${logoHtml}
              <td style="vertical-align: middle;">
                <span style="color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: inline-block;">
                  ${companyName.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Main Card Body: Clean Dynamic Content -->
        <div style="padding: 28px 28px; color: #334155; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;">
${bodyText}
        </div>

        <!-- Footer: Company Contact Details -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: left; font-size: 12px; color: #64748b; line-height: 1.6;">
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">${companyName}</div>
          ${companyAddress ? `<div style="margin-bottom: 3px;">${companyAddress}</div>` : ''}
          <div style="color: #475569;">
            ${companyPhone ? `<span><strong>Mobile:</strong> ${companyPhone}</span>` : ''}
            ${companyPhone && companyEmail ? ` &nbsp;|&nbsp; ` : ''}
            ${companyEmail ? `<span><strong>Email:</strong> ${companyEmail}</span>` : ''}
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            This is an automated notification. For any queries, please reach out to our team.
          </div>
        </div>

      </div>
    </div>
  `
}

// Helper function to paginate invoice items into structured A4 pages
function paginateInvoiceItems(items) {
  if (!items || items.length === 0) {
    return [{
      pageIndex: 1,
      totalPages: 1,
      items: [],
      isFirstPage: true,
      isLastPage: true,
      showSummary: true
    }]
  }

  // 1 to 5 Items: Always single-page mode
  if (items.length <= 5) {
    return [{
      pageIndex: 1,
      totalPages: 1,
      startIndex: 0,
      items: items,
      isFirstPage: true,
      isLastPage: true,
      showSummary: true
    }]
  }

  // 6+ Items: Dynamic Multi-Page Mode
  const pages = []
  const total = items.length

  const firstPageItemCount = total <= 8 ? Math.ceil(total / 2) : 6
  const page1Items = items.slice(0, firstPageItemCount)
  pages.push({
    pageIndex: 1,
    startIndex: 0,
    items: page1Items,
    isFirstPage: true,
    isLastPage: false,
    showSummary: false
  })

  let currentIndex = firstPageItemCount
  while (currentIndex < total) {
    const remaining = total - currentIndex
    if (remaining <= 6) {
      pages.push({
        pageIndex: pages.length + 1,
        startIndex: currentIndex,
        items: items.slice(currentIndex),
        isFirstPage: false,
        isLastPage: true,
        showSummary: true
      })
      break
    } else {
      const chunkSize = Math.min(remaining, 10)
      const isLast = (currentIndex + chunkSize) >= total
      pages.push({
        pageIndex: pages.length + 1,
        startIndex: currentIndex,
        items: items.slice(currentIndex, currentIndex + chunkSize),
        isFirstPage: false,
        isLastPage: isLast,
        showSummary: isLast
      })
      currentIndex += chunkSize
    }
  }

  const totalPages = pages.length
  return pages.map(p => ({ ...p, totalPages }))
}

/**
 * Generate 100% Exact Pixel-Perfect Multi-Page HTML Template Matching InvoiceTemplate.jsx
 */
export function generateInvoiceHtml(bill, settings = {}) {
  const companyName = settings.company_name || 'SIMCHA INFO SOLUTIONS'
  const companyGstin = settings.gstin || '33GEZPM1178G1ZY'
  const companyPhone = settings.phone || '8122022060'
  const cleanPhone = (companyPhone || '8122022060').toString().trim()
  let displayPhone = cleanPhone
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '')
  if (digitsOnly.length === 10) {
    displayPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2)
    displayPhone = `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  const companyEmail = settings.email || 'simchainfosolutions@gmail.com'
  const companyAddress = settings.address || '7A3, Thulasi Ammal Layout 2nd Street, Lakshmipuram, Peelamedu Post, Coimbatore - 641 004.'
  const bankName = settings.bank_name || 'Canara Bank'
  const bankBranch = settings.branch || 'Peelamedu'
  const bankAccountName = settings.account_name || 'Simcha Info Solutions'
  const bankAccountNo = settings.account_no || '120041754011'
  const bankIfsc = settings.ifsc_code || 'CNRB0002732'
  const bankImageUrl = settings.bank_image_url || settings.bankImageUrl || bill.bank_image_url || ''
  const signatureUrl = settings.signature_url || settings.signatureUrl || bill.signature_url || ''

  let termsList = []
  const targetTerms = settings.invoice_terms || settings.terms_conditions
  if (Array.isArray(targetTerms)) {
    termsList = targetTerms
  } else if (typeof targetTerms === 'string') {
    try {
      termsList = JSON.parse(targetTerms)
    } catch {
      termsList = [targetTerms]
    }
  }
  if (!Array.isArray(termsList)) {
    termsList = []
  }

  const items = Array.isArray(bill.items) ? bill.items : []
  const isGstInvoice = bill.invoice_type === 'GST' || (!bill.invoice_type && parseFloat(bill.total_tax || 0) > 0)
  const isIntraState = !bill.place_of_supply || bill.place_of_supply.includes('33') || bill.place_of_supply.toLowerCase().includes('tamil nadu')
  const isServiceBill = Boolean(bill.is_service || bill.service_number)

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)
  const totalTaxAmt = isGstInvoice ? items.reduce((sum, it) => sum + (parseFloat(it.tax_amount) || 0), 0) : 0
  const effectiveTotalTax = parseFloat(bill.total_tax || 0) || totalTaxAmt || 0
  const isGst = isGstInvoice || effectiveTotalTax > 0
  const cgstRateVal = parseFloat(bill.cgst_rate || settings.cgst_rate || 9).toFixed(2)
  const sgstRateVal = parseFloat(bill.sgst_rate || settings.sgst_rate || 9).toFixed(2)
  const igstRateVal = parseFloat(bill.igst_rate || settings.igst_rate || 18).toFixed(2)
  const cgstAmountVal = parseFloat(bill.cgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const sgstAmountVal = parseFloat(bill.sgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const igstAmountVal = parseFloat(bill.igst_amount) || (!isIntraState ? effectiveTotalTax : 0)
  const taxableAmountVal = bill.taxable_amount || (parseFloat(bill.total_amount || 0) - effectiveTotalTax)
  const totalGrossAmt = items.reduce((sum, it) => sum + (parseFloat(it.amount) || (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0))), 0)
  const totalDiscountSavings = items.reduce((sum, it) => sum + ((parseFloat(it.discount_amount) || 0) * (parseFloat(it.quantity) || 1)), 0)
  const totalGrossOrigAmt = items.reduce((sum, it) => sum + (((parseFloat(it.original_rate) || parseFloat(it.rate) || 0)) * (parseFloat(it.quantity) || 1)), 0) || totalGrossAmt

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatQty = (qty) => {
    const num = parseFloat(qty) || 0
    return num % 1 === 0 ? parseInt(num, 10) : num
  }

  // Assets
  const logoDataUri = getBase64Image('../../../frontend/src/assets/Logo/Logo-bg-remove.png')
  const watermarkDataUri = getBase64Image('../../../frontend/src/assets/Logo/Favicon.jpeg')

  const paginatedPages = paginateInvoiceItems(items)

  const renderItemRow = (item, index, page) => {
    if (isServiceBill) {
      return `
        <tr>
          <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${(page?.startIndex || 0) + index + 1}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
            <div style="font-weight: 700; font-size: 10.5px; color: #292424;">
              ${item.product_name || item.item_name || item.name}
              ${item.brand_model ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.brand_model})</span>` : ''}
            </div>
            ${item.serial_number && item.serial_number.trim() && item.serial_number.trim() !== (item.brand_model || '').trim() ? `<div style="font-size: 10px; font-weight: 700; color: #111827; margin-top: 2px;">S/N: ${item.serial_number}</div>` : ''}
            ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px; color: #292424;">
            <div>${item.issue_description || item.reported_issue || 'General Service & Repair'}</div>
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${formatQty(item.quantity)}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${parseFloat(item.rate || item.original_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
            ${parseFloat(item.tax_amount || 0) > 0 ? parseFloat(item.tax_amount).toFixed(2) : '—'}
          </td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: 700; color: #292424; vertical-align: top;">
            ${parseFloat(item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
    }
    return `
      <tr>
        <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${(page?.startIndex || 0) + index + 1}
        </td>
        <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
          <div style="font-weight: normal; font-size: 10.5px; color: #292424;">
            ${item.item_name || item.name}
            ${item.unit ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.unit})</span>` : ''}
          </div>
          ${item.brand && item.brand.trim() && item.brand.trim() !== '—' ? `<div style="font-size: 10px; color: #4b5563; font-weight: normal; margin-top: 1px;">Brand: ${item.brand}</div>` : ''}
          ${item.serial_number && item.serial_number.trim() ? `<div style="font-size: 10.5px; font-weight: 700; color: #1f2937; margin-top: 2px;">Serial No: ${item.serial_number}</div>` : ''}
          ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${item.hsn_code || '-'}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${formatQty(item.quantity)} Unit
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${isGstInvoice && parseFloat(item.tax_amount || 0) > 0 ? `${parseFloat(item.tax_amount || 0).toFixed(2)}` : '0.00'}
        </td>
        <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `
  }

  const pagesHtml = paginatedPages.map((page) => `
    <div class="page-container" style="page-break-after: ${page.pageIndex < page.totalPages ? 'always' : 'avoid'}; break-after: ${page.pageIndex < page.totalPages ? 'page' : 'avoid'};">
      
      <!-- Watermark -->
      <div class="watermark">
        ${watermarkDataUri ? `<img src="${watermarkDataUri}" alt="Watermark" />` : ''}
      </div>

      <div class="content">
        
        ${page.isFirstPage ? `
          <!-- PAGE 1: Full Official Letterhead Header -->
          ${page.totalPages > 1 ? `
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">
                Page ${page.pageIndex} of ${page.totalPages}
              </span>
            </div>
          ` : ''}

          <div class="header-top">
            <div class="logo-branding">
              ${logoDataUri ? `<img src="${logoDataUri}" class="logo-img" alt="Logo" />` : ''}
              <div>
                <h1 class="company-title" style="color: #111827 !important; font-size: 23px; font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; font-family: 'Segoe UI', Arial, sans-serif !important;">${companyName}</h1>
                <p class="company-tagline">IT CONSULTING | HARDWARE &amp; SOFTWARE SOLUTIONS | SALES &amp; SERVICE</p>
                <p class="company-address">${companyAddress}</p>
                <p class="company-contact"><strong>Mobile:</strong> ${companyPhone} &nbsp;|&nbsp; <strong>Email:</strong> ${companyEmail}</p>
              </div>
            </div>
            <div class="gstin-box">
              <span style="color: #6b7280; font-family: Arial, Helvetica, sans-serif; font-size: 11px;">GSTIN: </span>${companyGstin}
            </div>
          </div>

          <div class="divider-blue" style="width: 100%; border-bottom: 2.5px solid #111827 !important; height: 0px; margin-top: 8px; margin-bottom: 12px;"></div>

          <!-- Meta Ribbon -->
          <div class="meta-ribbon" style="background-color: #f3f4f6 !important; border: 1px solid #d1d5db !important; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #292424; margin-bottom: 12px;">
            <div>
              <span class="meta-label">INVOICE NUMBER:</span>
              <span style="font-size: 12px; font-weight: 700;">${bill.invoice_number}</span>
            </div>
            <div>
              <span class="meta-label">INVOICE DATE:</span>
              <span style="font-size: 11px; font-weight: 700;">${formatDate(bill.invoice_date)}</span>
            </div>
          </div>

          <!-- Customer Details: Two Columns (BILL TO & DELIVERY ADDRESS) -->
          <div class="customer-card">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Left: BILL TO -->
              <div style="border-right: 1px solid #e5e7eb; padding-right: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <div class="customer-title">${isServiceBill ? 'CUSTOMER DETAILS' : 'BILLING DETAILS'}</div>
                    <div class="customer-name">${bill.customer_name}</div>
                  </div>
                  <span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #292424; background: #f3f4f6; border: 1px solid #d1d5db; padding: 2px 6px;">
                    ${bill.copy_type === 'DUPLICATE' ? 'DUPLICATE' : (bill.copy_type === 'TRIPLICATE' ? 'TRIPLICATE' : 'ORIGINAL')}
                  </span>
                </div>
                ${bill.customer_address ? `<div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">${bill.customer_address}</div>` : ''}
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  ${bill.customer_phone ? `<div><span style="font-weight: normal; color: #4b5563;">Mobile:</span> <span>${bill.customer_phone}</span></div>` : ''}
                  ${bill.customer_email ? `<div><span style="font-weight: normal; color: #4b5563;">Email:</span> <span>${bill.customer_email}</span></div>` : ''}
                  ${bill.customer_gstin ? `<div><span style="font-weight: normal; color: #4b5563;">GSTIN:</span> <span style="font-weight: normal;">${bill.customer_gstin}</span></div>` : ''}
                </div>
              </div>

              <!-- Right: DELIVERY ADDRESS -->
              <div>
                <div class="customer-title">${isServiceBill ? 'DELIVERY / SITE ADDRESS' : 'DELIVERY / SHIPPING ADDRESS'}</div>
                <div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">
                  ${bill.same_as_billing || !bill.delivery_address || bill.delivery_address.trim() === ''
                    ? (bill.customer_address ? bill.customer_address : 'Same as billing address')
                    : bill.delivery_address}
                </div>
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  <div><span style="font-weight: normal; color: #4b5563;">Destination:</span> ${bill.place_of_supply || '33-Tamil Nadu'}</div>
                  ${bill.customer_phone ? `<div><span style="font-weight: normal; color: #4b5563;">Contact:</span> ${bill.customer_phone}</div>` : ''}
                  ${bill.has_due_date && bill.due_date ? `<div><span style="font-weight: normal; color: #4b5563;">Due Date:</span> ${formatDate(bill.due_date)}</div>` : ''}
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- PAGE 2+: Compact Mini Letterhead Header -->
          <div style="border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">
                ${bill.copy_type === 'DUPLICATE' ? 'DUPLICATE' : (bill.copy_type === 'TRIPLICATE' ? 'TRIPLICATE' : 'ORIGINAL')}
              </span>
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #111827; letter-spacing: 0.5px;">
                Invoice #${bill.invoice_number} • Page ${page.pageIndex} of ${page.totalPages}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${logoDataUri ? `<img src="${logoDataUri}" style="height: 38px; width: auto; object-fit: contain;" alt="Logo" />` : ''}
                <div>
                  <div style="font-size: 16px; font-weight: 900; color: #111827; line-height: 1;">${companyName}</div>
                  <div style="font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-top: 2px;">
                    ${isGstInvoice ? 'GST TAX INVOICE' : 'INVOICE'}
                  </div>
                </div>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: 700;">
                <div><span style="color: #6b7280; font-weight: 500;">Date: </span>${formatDate(bill.invoice_date)}</div>
                <div style="font-size: 10.5px; color: #4b5563;">GSTIN: ${companyGstin}</div>
              </div>
            </div>
          </div>
        `}

        <!-- Line Items Table -->
        <div class="table-container">
          <table>
            <thead>
              ${isServiceBill ? `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 5%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 30%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">PRODUCT &amp; MODEL</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 27%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">REPORTED ISSUE / SERVICE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 8%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              ` : `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 6%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">S.NO</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 38%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">ITEMS</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 12%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">HSN/SAC</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 12%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${page.items.map((item, idx) => renderItemRow(item, idx, page)).join('')}
            </tbody>
            ${page.showSummary ? `
              <tfoot>
                ${isServiceBill ? `
                  <tr>
                    <td colspan="3" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase;">TOTAL ITEMS: ${bill.items?.length || page.items?.length || 1}</td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)}</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : `
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-transform: uppercase;">SUB TOTAL</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)} Unit</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `}
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${page.showSummary ? `
          <!-- Bottom Split -->
          <div class="bottom-grid" style="display: grid; grid-template-columns: ${bankImageUrl ? '5fr 3fr 4fr' : '7fr 5fr'}; gap: ${bankImageUrl ? '14px' : '24px'}; margin-top: 8px;">
            
            <!-- Left: Bank Details & Terms -->
            <div>
              <div style="margin-bottom: 10px;">
                <div class="bank-title">BANK DETAILS</div>
                <div class="bank-details">
                  <div><span style="font-weight: normal; color: #4b5563;">Beneficiary:</span> ${bankAccountName}</div>
                  <div><span style="font-weight: normal; color: #4b5563;">Bank:</span> ${bankName}</div>
                  <div><span style="font-weight: normal; color: #4b5563;">Account No:</span> <span style="font-weight: normal;">${bankAccountNo}</span></div>
                  <div><span style="font-weight: normal; color: #4b5563;">IFSC Code:</span> <span style="font-weight: normal;">${bankIfsc}</span></div>
                  <div><span style="font-weight: normal; color: #4b5563;">Branch:</span> ${bankBranch}</div>
                </div>
              </div>

              ${termsList && termsList.length > 0 ? `
                <div>
                  <div class="terms-title">TERMS &amp; CONDITIONS</div>
                  <ol class="terms-list">
                    ${termsList.map(t => `<li>${t}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}
            </div>

            <!-- Center: Scan to Pay QR Code (Only if available) -->
            ${bankImageUrl ? `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; padding-top: 2px;">
                <div class="bank-title" style="margin-bottom: 4px;">SCAN TO PAY</div>
                <div style="display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 4px; border: 1px solid #e5e7eb; border-radius: 4px;">
                  <img src="${bankImageUrl}" alt="Scan to Pay QR" style="height: 110px; width: 110px; max-height: 120px; max-width: 120px; object-fit: contain; display: block;" />
                </div>
              </div>
            ` : ''}

            <!-- Right: Totals & Signatory -->
            <div class="totals-section">
              <div>
                <div class="totals-row" style="font-size: 10.5px; color: #4b5563;">
                  <span>Gross Amount</span>
                  <span>${parseFloat(totalGrossOrigAmt || bill.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${totalDiscountSavings > 0 ? `
                  <div class="totals-row" style="font-size: 10.5px; font-weight: bold; color: #047857;">
                    <span>Discount Savings</span>
                    <span>- ${parseFloat(totalDiscountSavings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}

                <div class="totals-row">
                  <span>Taxable Amount</span>
                  <span style="font-weight: normal;">${parseFloat(taxableAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${isGst && effectiveTotalTax > 0 ? (
                  isIntraState ? `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>CGST (${cgstRateVal}%)</span>
                      <span>${parseFloat(cgstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>SGST (${sgstRateVal}%)</span>
                      <span>${parseFloat(sgstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ` : `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>IGST (${igstRateVal}%)</span>
                      <span>${parseFloat(igstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  `
                ) : ''}

                ${bill.round_off && parseFloat(bill.round_off) !== 0 ? `
                  <div class="totals-row" style="font-size: 10.5px; color: #6b7280;">
                    <span>Round Off</span>
                    <span>${bill.round_off > 0 ? `+${bill.round_off}` : `-${Math.abs(bill.round_off)}`}</span>
                  </div>
                ` : ''}

                <div class="grand-total-row">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Invoice Total</span>
                  <span style="font-size: 15px; font-weight: 700;">${parseFloat(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${bill.amount_in_words ? `
                  <div class="amount-words">
                    <strong style="font-size: 10.5px; font-weight: 700;">Invoice Amount (in words):</strong>
                    <div style="font-style: italic; color: #292424; font-size: 10.5px; font-weight: normal; margin-top: 2px;">${bill.amount_in_words}</div>
                  </div>
                ` : ''}
              </div>

              <!-- Signatory -->
              <div class="signatory-box" style="margin-top: ${signatureUrl ? '10px' : '30px'}; text-align: center;">
                ${signatureUrl ? `
                  <div style="display: flex; justify-content: center; align-items: center; height: 38px; margin-bottom: 3px;">
                    <img src="${signatureUrl}" alt="Authorized Signature" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto;" />
                  </div>
                ` : ''}
                <div class="signatory-line" style="width: 100%; max-width: 200px; margin: 0 auto; border-top: 1px solid #9ca3af; padding-top: 3px;">
                  <p style="font-size: 9.5px; color: #4b5563;">Authorized signatory for</p>
                  <p style="font-size: 11px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">${companyName}</p>
                </div>
              </div>

            </div>

          </div>
        ` : ''}

      </div>

      <!-- Footer Ribbon Matching Brand Letterhead -->
      <div class="footer-ribbon">
        <div class="footer-left">
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#003882"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <span style="font-weight: 700; letter-spacing: 0.3px;">${displayPhone}</span>
          </div>
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="#003882" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6.5L2 7"/></svg>
            </div>
            <span style="font-weight: 500;">${companyEmail}</span>
          </div>
        </div>

        <div class="slanted-divider"></div>

        <div class="footer-right">
          <div class="icon-circle" style="flex-shrink: 0;">
            <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="#003882"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.8" fill="#ffffff"/></svg>
          </div>
          <span class="footer-address-text">${companyAddress}</span>
        </div>
      </div>

    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${bill.invoice_number}</title>
      <style>
        /* Google Fonts removed: unreliable in Vercel/headless Chromium environment */
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        h1, h2, h3, h4, p {
          margin: 0;
          padding: 0;
          font-size: inherit;
          font-weight: normal;
        }

        body {
          font-family: Arial, Helvetica, sans-serif !important;
          color: #292424;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .page-container {
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          padding: 30px 32px 0 32px;
          background: #ffffff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        @media print {
          .page-container {
            page-break-after: always;
            break-after: page;
          }
          .page-container:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }

        .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .watermark img {
          width: 320px;
          max-width: 100%;
          filter: grayscale(100%);
        }

        .content {
          position: relative;
          z-index: 10;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-branding {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-img {
          height: 85px;
          width: auto;
          object-fit: contain;
        }

        .company-title {
          font-size: 23px;
          font-weight: 900;
          color: #111827;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .company-tagline {
          font-size: 9px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 3px;
        }

        .company-address {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
          max-width: 480px;
        }

        .company-contact {
          font-size: 10.5px;
          color: #374151;
          margin-top: 2px;
        }

        .gstin-box {
          font-size: 12px;
          font-weight: 700;
          color: #292424;
          text-align: right;
          white-space: nowrap;
        }

        .divider-blue {
          width: 100%;
          height: 2px;
          background-color: #111827;
          margin-top: 8px;
          margin-bottom: 12px;
        }

        .meta-ribbon {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          margin-bottom: 12px;
        }

        .meta-label {
          color: #4b5563;
          font-weight: 700;
          text-transform: uppercase;
          margin-right: 6px;
        }

        .customer-card {
          border: 1px solid #d1d5db;
          padding: 10px 14px;
          background-color: rgba(255, 255, 255, 0.9);
          margin-bottom: 12px;
          font-size: 10.5px;
        }

        .customer-title {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .customer-name {
          font-size: 10.5px;
          font-weight: normal;
          color: #292424;
          margin-bottom: 2px;
        }

        .table-container {
          border: 1px solid #d1d5db;
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        thead tr {
          background-color: #f3f4f6;
          border-bottom: 1px solid #d1d5db;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        tfoot tr {
          background-color: #f3f4f6;
          border-top: 1px solid #d1d5db;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 24px;
          margin-top: 8px;
        }

        .bank-title, .terms-title {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .bank-details {
          font-size: 10.5px;
          font-weight: normal;
          color: #1f2937;
          line-height: 1.5;
        }

        .terms-list {
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding-left: 14px;
          line-height: 1.4;
        }

        .totals-section {
          padding-left: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding: 1.5px 0;
        }

        .grand-total-row {
          border-top: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
          padding: 5px 0;
          margin: 5px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #292424;
        }

        .amount-words {
          font-size: 10.5px;
          font-weight: normal;
          color: #4b5563;
          margin-top: 2px;
          text-transform: capitalize;
        }

        .signatory-box {
          margin-top: 40px;
          text-align: center;
        }

        .signatory-line {
          width: 200px;
          margin-left: auto;
          border-top: 1px solid #9ca3af;
          padding-top: 4px;
        }

        .footer-ribbon {
          background-color: #003882;
          color: #ffffff;
          padding: 8px 24px;
          margin: 14px -32px 0 -32px;
          display: flex;
          align-items: center;
          font-size: 9.5px;
          font-weight: 500;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
        }

        .footer-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .icon-circle {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .slanted-divider {
          height: 28px;
          width: 2px;
          background-color: #ffffff;
          transform: rotate(25deg);
          margin: 0 16px;
          flex-shrink: 0;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .footer-address-text {
          font-size: 8.8px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          color: #ffffff;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `
}

/**
 * Generate 100% Vector PDF Buffer via Headless Chrome / Puppeteer
 */
export async function generateInvoicePdfBuffer(bill, settings = {}) {
  const htmlContent = generateInvoiceHtml(bill, settings)
  const browser = await launchPuppeteerBrowser()

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * Send Invoice PDF Email via configured SMTP
 */
export async function sendInvoiceEmail(billId, customRecipient = null, customPdfBase64 = null) {
  try {
    const pool = getPool()

    // 1. Fetch Email Config
    const [configRows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (configRows.length === 0) {
      return { success: false, message: 'Email configurations not found.' }
    }
    const config = configRows[0]

    if (!config.smtp_user || !config.smtp_pass) {
      return { success: false, message: 'SMTP credentials (User/Password) not configured in Settings.' }
    }

    // 2. Fetch Bill Details & Settings
    const [billRows] = await pool.query('SELECT * FROM bills WHERE id = ?', [billId])
    if (billRows.length === 0) {
      return { success: false, message: 'Invoice bill record not found.' }
    }
    const bill = billRows[0]

    const [itemRows] = await pool.query(`
      SELECT bi.*, COALESCE(bi.brand, m.brand) AS brand 
      FROM bill_items bi 
      LEFT JOIN materials m ON bi.material_id = m.id 
      WHERE bi.bill_id = ? 
      ORDER BY bi.id ASC
    `, [billId])
    bill.items = itemRows

    const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1')
    const settings = settingsRows.length > 0 ? settingsRows[0] : {}

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === 1 || config.smtp_secure === true,
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    const formattedDate = new Date(bill.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedTotal = `${parseFloat(bill.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const companyDisplayName = settings.company_name || config.sender_name || 'Billing System'
    const companyDisplayAddress = settings.address || ''
    const companyDisplayPhone = settings.phone || ''

    const vars = {
      company_name: companyDisplayName,
      customer_name: bill.customer_name || '',
      invoice_number: bill.invoice_number || '',
      date: formattedDate,
      total_amount: formattedTotal,
      amount: formattedTotal
    }

    const logoAttachment = getLogoAttachment(settings)
    const templateSubject = renderTemplateText(config.sales_invoice_subject, vars)
    const templateBody = renderTemplateText(config.sales_invoice_body, vars)
    const htmlBody = buildBrandedEmailHtml(templateBody, {
      ...settings,
      company_name: companyDisplayName,
      logo_url: settings.logo_url,
      phone: companyDisplayPhone,
      email: config.smtp_user || settings.email,
      address: companyDisplayAddress
    })

    // Case A: Custom single recipient dispatch (e.g. from table action)
    if (customRecipient) {
      const isCustomer = bill.customer_email && customRecipient.trim().toLowerCase() === bill.customer_email.trim().toLowerCase()
      const copyType = isCustomer ? 'ORIGINAL' : (bill.copy_type || 'DUPLICATE')
      const pdfBuffer = customPdfBase64
        ? Buffer.from(customPdfBase64, 'base64')
        : await generateInvoicePdfBuffer({ ...bill, copy_type: copyType }, settings)
      
      await transporter.sendMail({
        from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
        to: customRecipient.trim(),
        subject: templateSubject,
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${bill.invoice_number}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })

      // Update database record: mark invoice_sent = 1, invoice_sent_at = NOW()
      try {
        await pool.query('UPDATE bills SET invoice_sent = 1, invoice_sent_at = NOW() WHERE id = ?', [billId])
      } catch (dbErr) {
        console.warn('Could not update invoice_sent in bills table:', dbErr.message)
      }

      return {
        success: true,
        message: `Invoice PDF email sent successfully to ${customRecipient}`
      }
    }

    // Case B: Auto-Dispatch Workflow
    const dispatchedTo = []

    // 1. Admin/Company Copy (Duplicate Copy PDF)
    const adminEmail = (config.recipient_email || config.smtp_user || '').trim()
    if (adminEmail) {
      const duplicatePdfBuffer = await generateInvoicePdfBuffer({ ...bill, copy_type: 'DUPLICATE' }, settings)
      const adminSubject = templateSubject ? `${templateSubject} (Duplicate Copy)` : ''

      await transporter.sendMail({
        from: `"${config.sender_name || 'Simcha Info Solutions'}" <${config.smtp_user}>`,
        to: adminEmail,
        subject: adminSubject,
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${bill.invoice_number}_Duplicate.pdf`,
            content: duplicatePdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })
      dispatchedTo.push(`Admin (${adminEmail} - Duplicate)`)
    }

    // 2. Customer Copy (Original Copy PDF - if enabled in settings & email present)
    const allowCustomerCopy = config.email_customer_copy !== false && config.email_customer_copy !== 0 && config.email_customer_copy !== '0'
    if (allowCustomerCopy && bill.customer_email && bill.customer_email.trim()) {
      const customerEmail = bill.customer_email.trim()
      const originalPdfBuffer = await generateInvoicePdfBuffer({ ...bill, copy_type: 'ORIGINAL' }, settings)

      await transporter.sendMail({
        from: `"${config.sender_name || 'Simcha Info Solutions'}" <${config.smtp_user}>`,
        to: customerEmail,
        subject: templateSubject,
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Invoice_${bill.invoice_number}.pdf`,
            content: originalPdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })
      dispatchedTo.push(`Customer (${customerEmail} - Original)`)
    }

    if (dispatchedTo.length > 0) {
      try {
        await pool.query('UPDATE bills SET invoice_sent = 1, invoice_sent_at = NOW() WHERE id = ?', [billId])
      } catch (dbErr) {
        console.warn('Could not update invoice_sent in bills table:', dbErr.message)
      }
    }

    console.log(`📧 Invoice emails successfully dispatched for #${bill.invoice_number}: ${dispatchedTo.join(', ')}`)

    return {
      success: true,
      message: `Invoice dispatched to: ${dispatchedTo.join(', ')}`
    }
  } catch (error) {
    console.error('❌ Error sending invoice email:', error)
    return {
      success: false,
      message: error.message || 'Failed to dispatch invoice email via SMTP.'
    }
  }
}

/**
 * Send a quick test email to verify SMTP credentials
 */
export async function sendTestEmail(config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === true || config.smtp_secure === 'true',
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    // Verify SMTP connection
    await transporter.verify()

    const targetRecipient = config.recipient_email || config.smtp_user

    const mailOptions = {
      from: `"${config.sender_name || 'Simcha Info Solutions'}" <${config.smtp_user}>`,
      to: targetRecipient,
      subject: '✅ Simcha Billing - SMTP Test Connection Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="background-color: #111827; padding: 20px; color: white;">
            <h2 style="margin: 0; font-size: 18px;">Simcha Billing - SMTP Verification</h2>
          </div>
          <div style="padding: 20px; color: #334155;">
            <p style="font-size: 14px;">Hello Admin,</p>
            <p style="font-size: 13.5px; line-height: 1.5;">
              This is a test email confirming that your <strong>Simcha Billing SMTP Email Gateway</strong> has been configured successfully and is operational!
            </p>
            <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 4px; font-size: 12px; margin: 15px 0;">
              <div><strong>SMTP Host:</strong> ${config.smtp_host}</div>
              <div><strong>Port:</strong> ${config.smtp_port}</div>
              <div><strong>Sender Email:</strong> ${config.smtp_user}</div>
              <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <p style="font-size: 12px; color: #16a34a; font-weight: bold;">
              ✓ Automated Bill PDF dispatch is ready to send invoices upon generation.
            </p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    return {
      success: true,
      message: `Test email sent successfully to ${targetRecipient}`,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('❌ SMTP Test failed:', error)
    return {
      success: false,
      message: error.message || 'SMTP Authentication failed. Check your email and App Password.'
    }
  }
}

/**
 * Generate 100% Exact Pixel-Perfect Receipt HTML Template (No Bank Details, No QR Code)
 */
export function generateReceiptHtml(bill, settings = {}) {
  const companyName = settings.company_name || 'SIMCHA INFO SOLUTIONS'
  const companyGstin = settings.gstin || '33GEZPM1178G1ZY'
  const companyPhone = settings.phone || '8122022060'
  const cleanPhone = (companyPhone || '8122022060').toString().trim()
  let displayPhone = cleanPhone
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '')
  if (digitsOnly.length === 10) {
    displayPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2)
    displayPhone = `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  const companyEmail = settings.email || 'simchainfosolutions@gmail.com'
  const companyAddress = settings.address || '7A3, Thulasi Ammal Layout 2nd Street, Lakshmipuram, Peelamedu Post, Coimbatore - 641 004.'
  const signatureUrl = settings.signature_url || settings.signatureUrl || bill.signature_url || ''
  const bankName = settings.bank_name || 'HDFC BANK'
  const bankAccountName = settings.account_holder_name || settings.company_name || 'SIMCHA INFO SOLUTIONS'
  const bankAccountNo = settings.account_number || '50200085472190'
  const bankIfsc = settings.ifsc_code || 'HDFC0000240'
  const bankBranch = settings.branch_name || 'PEELAMEDU'

  let termsList = []
  const targetTerms = settings.receipt_terms || settings.terms_conditions
  if (Array.isArray(targetTerms)) {
    termsList = targetTerms
  } else if (typeof targetTerms === 'string') {
    try {
      termsList = JSON.parse(targetTerms)
    } catch {
      termsList = [targetTerms]
    }
  }
  if (!Array.isArray(termsList)) {
    termsList = []
  }

  const items = Array.isArray(bill.items) ? bill.items : []
  const isGstInvoice = bill.invoice_type === 'GST' || (!bill.invoice_type && parseFloat(bill.total_tax || 0) > 0)
  const isIntraState = !bill.place_of_supply || bill.place_of_supply.includes('33') || bill.place_of_supply.toLowerCase().includes('tamil nadu')
  const isServiceBill = Boolean(bill.is_service || bill.service_number)

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)
  const totalTaxAmt = isGstInvoice ? items.reduce((sum, it) => sum + (parseFloat(it.tax_amount) || 0), 0) : 0
  const totalGrossAmt = items.reduce((sum, it) => sum + (parseFloat(it.amount) || (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0))), 0)

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatQty = (qty) => {
    const num = parseFloat(qty) || 0
    return num % 1 === 0 ? parseInt(num, 10) : num
  }

  // Assets
  const logoDataUri = getBase64Image('../../../frontend/src/assets/Logo/Logo-bg-remove.png')
  const watermarkDataUri = getBase64Image('../../../frontend/src/assets/Logo/Favicon.jpeg')

  const paginatedPages = paginateInvoiceItems(items)

  const renderItemRow = (item, index, page) => {
    if (isServiceBill) {
      return `
        <tr>
          <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${(page?.startIndex || 0) + index + 1}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
            <div style="font-weight: 700; font-size: 10.5px; color: #292424;">
              ${item.product_name || item.item_name || item.name}
              ${item.brand_model ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.brand_model})</span>` : ''}
            </div>
            ${item.serial_number && item.serial_number.trim() && item.serial_number.trim() !== (item.brand_model || '').trim() ? `<div style="font-size: 10px; font-weight: 700; color: #111827; margin-top: 2px;">S/N: ${item.serial_number}</div>` : ''}
            ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px; color: #292424;">
            <div>${item.issue_description || item.reported_issue || 'General Service & Repair'}</div>
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${formatQty(item.quantity)}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${parseFloat(item.rate || item.original_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
            ${parseFloat(item.tax_amount || 0) > 0 ? parseFloat(item.tax_amount).toFixed(2) : '—'}
          </td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: 700; color: #292424; vertical-align: top;">
            ${parseFloat(item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
    }
    return `
      <tr>
        <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${(page?.startIndex || 0) + index + 1}
        </td>
        <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
          <div style="font-weight: normal; font-size: 10.5px; color: #292424;">
            ${item.item_name || item.name}
            ${item.unit ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.unit})</span>` : ''}
          </div>
          ${item.brand && item.brand.trim() && item.brand.trim() !== '—' ? `<div style="font-size: 10px; color: #4b5563; font-weight: normal; margin-top: 1px;">Brand: ${item.brand}</div>` : ''}
          ${item.serial_number && item.serial_number.trim() ? `<div style="font-size: 10.5px; font-weight: 700; color: #1f2937; margin-top: 2px;">Serial No: ${item.serial_number}</div>` : ''}
          ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${item.hsn_code || '-'}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${formatQty(item.quantity)} Unit
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${isGstInvoice && parseFloat(item.tax_amount || 0) > 0 ? `${parseFloat(item.tax_amount || 0).toFixed(2)}` : '0.00'}
        </td>
        <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `
  }

  const pagesHtml = paginatedPages.map((page) => `
    <div class="page-container" style="page-break-after: ${page.pageIndex < page.totalPages ? 'always' : 'avoid'}; break-after: ${page.pageIndex < page.totalPages ? 'page' : 'avoid'};">
      
      <!-- Watermark -->
      <div class="watermark">
        ${watermarkDataUri ? `<img src="${watermarkDataUri}" alt="Watermark" />` : ''}
      </div>

      <div class="content">
        
        ${page.isFirstPage ? `
          <div class="header-top">
            <div class="logo-branding">
              ${logoDataUri ? `<img src="${logoDataUri}" class="logo-img" alt="Logo" />` : ''}
              <div>
                <h1 class="company-title" style="color: #111827 !important; font-size: 23px; font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; font-family: 'Segoe UI', Arial, sans-serif !important;">${companyName}</h1>
                <p class="company-tagline">IT CONSULTING | HARDWARE &amp; SOFTWARE SOLUTIONS | SALES &amp; SERVICE</p>
                <p class="company-address">${companyAddress}</p>
                <p class="company-contact"><strong>Mobile:</strong> ${companyPhone} &nbsp;|&nbsp; <strong>Email:</strong> ${companyEmail}</p>
              </div>
            </div>
            <div class="gstin-box">
              <span style="color: #6b7280; font-family: Arial, Helvetica, sans-serif; font-size: 11px;">GSTIN: </span>${companyGstin}
            </div>
          </div>

          <div class="divider-blue" style="width: 100%; border-bottom: 2.5px solid #111827 !important; height: 0px; margin-top: 8px; margin-bottom: 12px;"></div>

          <!-- Meta Ribbon (Receipt Specific) -->
          <div class="meta-ribbon" style="background-color: #f3f4f6 !important; border: 1px solid #d1d5db !important; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #292424; margin-bottom: 12px;">
            <div>
              <span class="meta-label">RECEIPT NUMBER:</span>
              <span style="font-size: 12px; font-weight: 700;">${bill.receipt_number || bill.invoice_number}</span>
            </div>
            <div>
              <span class="meta-label">RECEIPT DATE:</span>
              <span style="font-size: 11px; font-weight: 700;">${formatDate(new Date())}</span>
            </div>
          </div>

          <!-- Customer Details: Two Columns (RECEIVED FROM & DELIVERY ADDRESS) -->
          <div class="customer-card">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Left: RECEIVED FROM -->
              <div style="border-right: 1px solid #e5e7eb; padding-right: 12px;">
                <div class="customer-title">${isServiceBill ? 'CUSTOMER DETAILS' : 'PAYMENT RECEIVED FROM'}</div>
                <div class="customer-name">${bill.customer_name}</div>
                ${bill.customer_address ? `<div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">${bill.customer_address}</div>` : ''}
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  ${bill.customer_phone ? `<div><span style="font-weight: normal; color: #4b5563;">Mobile:</span> <span>${bill.customer_phone}</span></div>` : ''}
                  ${bill.customer_email ? `<div><span style="font-weight: normal; color: #4b5563;">Email:</span> <span>${bill.customer_email}</span></div>` : ''}
                  ${bill.customer_gstin ? `<div><span style="font-weight: normal; color: #4b5563;">GSTIN:</span> <span style="font-weight: normal;">${bill.customer_gstin}</span></div>` : ''}
                </div>
              </div>

              <!-- Right: DELIVERY ADDRESS -->
              <div>
                <div class="customer-title">${isServiceBill ? 'DELIVERY / SITE ADDRESS' : 'DELIVERY / SHIPPING ADDRESS'}</div>
                <div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">
                  ${bill.same_as_billing || !bill.delivery_address || bill.delivery_address.trim() === ''
                    ? (bill.customer_address ? bill.customer_address : 'Same as billing address')
                    : bill.delivery_address}
                </div>
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  <div><span style="font-weight: normal; color: #4b5563;">Destination:</span> ${bill.place_of_supply || '33-Tamil Nadu'}</div>
                  ${bill.customer_phone ? `<div><span style="font-weight: normal; color: #4b5563;">Contact:</span> ${bill.customer_phone}</div>` : ''}
                </div>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- PAGE 2+: Compact Mini Letterhead Header -->
          <div style="border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">
                PAYMENT RECEIPT
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${logoDataUri ? `<img src="${logoDataUri}" style="height: 38px; width: auto; object-fit: contain;" alt="Logo" />` : ''}
                <div>
                  <div style="font-size: 16px; font-weight: 900; color: #111827; line-height: 1;">${companyName}</div>
                  <div style="font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-top: 2px;">
                    PAYMENT RECEIPT
                  </div>
                </div>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: 700;">
                <div><span style="color: #6b7280; font-weight: 500;">Date: </span>${formatDate(new Date())}</div>
                <div style="font-size: 10.5px; color: #4b5563;">GSTIN: ${companyGstin}</div>
              </div>
            </div>
          </div>
        `}

        <!-- Line Items Table -->
        <div class="table-container">
          <table>
            <thead>
              ${isServiceBill ? `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 5%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 30%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">PRODUCT &amp; MODEL</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 27%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">REPORTED ISSUE / SERVICE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 8%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              ` : `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 6%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">S.NO</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 38%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">ITEMS</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 12%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">HSN/SAC</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 12%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${page.items.map((item, idx) => renderItemRow(item, idx, page)).join('')}
            </tbody>
            ${page.showSummary ? `
              <tfoot>
                ${isServiceBill ? `
                  <tr>
                    <td colspan="3" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase;">TOTAL ITEMS: ${bill.items?.length || page.items?.length || 1}</td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)}</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : `
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-transform: uppercase;">SUB TOTAL</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)} Unit</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `}
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${page.showSummary ? `
          <!-- Bottom Split: Bank Details, Payment Status & Terms -->
          <div class="bottom-grid">
            
            <!-- Left: Bank Details, Payment Status & Terms -->
            <div>
              <div style="margin-bottom: 8px;">
                <div class="bank-title">BANK DETAILS</div>
                <div class="bank-details">
                  <div><span style="font-weight: normal; color: #4b5563;">Beneficiary:</span> ${bankAccountName}</div>
                  <div><span style="font-weight: normal; color: #4b5563;">Bank:</span> ${bankName}</div>
                  <div><span style="font-weight: normal; color: #4b5563;">Account No:</span> <span style="font-weight: normal;">${bankAccountNo}</span></div>
                  <div><span style="font-weight: normal; color: #4b5563;">IFSC Code:</span> <span style="font-weight: normal;">${bankIfsc}</span></div>
                  <div><span style="font-weight: normal; color: #4b5563;">Branch:</span> ${bankBranch}</div>
                </div>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 10.5px; color: #475569; margin-bottom: 8px;">
                <div><strong>Payment Mode:</strong> ${bill.payment_mode || 'Cash'}</div>
                <div style="margin-top: 2px;"><strong>Payment Status:</strong> <span style="color: #047857; font-weight: bold;">PAID</span></div>
              </div>

              ${termsList && termsList.length > 0 ? `
                <div>
                  <div class="terms-title">TERMS &amp; CONDITIONS</div>
                  <ol class="terms-list">
                    ${termsList.map(t => `<li>${t}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}
            </div>

            <!-- Right: Totals & Signatory -->
            <div class="totals-section">
              <div>
                <div class="totals-row">
                  <span>Taxable Amount</span>
                  <span style="font-weight: normal;">${parseFloat(bill.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${isGstInvoice && parseFloat(bill.total_tax || 0) > 0 ? (
                  isIntraState ? `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>CGST (${bill.cgst_rate || settings.cgst_rate || 9}%)</span>
                      <span>${parseFloat(bill.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>SGST (${bill.sgst_rate || settings.sgst_rate || 9}%)</span>
                      <span>${parseFloat(bill.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ` : `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>IGST (${bill.igst_rate || settings.igst_rate || 18}%)</span>
                      <span>${parseFloat(bill.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  `
                ) : ''}

                ${bill.round_off && parseFloat(bill.round_off) !== 0 ? `
                  <div class="totals-row" style="font-size: 10.5px; color: #6b7280;">
                    <span>Round Off</span>
                    <span>${bill.round_off > 0 ? `+${bill.round_off}` : `-${Math.abs(bill.round_off)}`}</span>
                  </div>
                ` : ''}

                <div class="grand-total-row">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Total Amount Received</span>
                  <span style="font-size: 15px; font-weight: 700;">${parseFloat(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${bill.amount_in_words ? `
                  <div class="amount-words">
                    <strong style="font-size: 10.5px; font-weight: 700;">Received Amount (in words):</strong>
                    <div style="font-style: italic; color: #292424; font-size: 10.5px; font-weight: normal; margin-top: 2px;">${bill.amount_in_words}</div>
                  </div>
                ` : ''}
              </div>

              <!-- Signatory -->
              <div class="signatory-box" style="margin-top: ${signatureUrl ? '10px' : '30px'}; text-align: center;">
                ${signatureUrl ? `
                  <div style="display: flex; justify-content: center; align-items: center; height: 38px; margin-bottom: 3px;">
                    <img src="${signatureUrl}" alt="Authorized Signature" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto;" />
                  </div>
                ` : ''}
                <div class="signatory-line" style="width: 100%; max-width: 200px; margin: 0 auto; border-top: 1px solid #9ca3af; padding-top: 3px;">
                  <p style="font-size: 9.5px; color: #4b5563;">Authorized signatory for</p>
                  <p style="font-size: 11px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">${companyName}</p>
                </div>
              </div>

            </div>

          </div>
        ` : ''}

      </div>

      <!-- Footer Ribbon Matching Brand Letterhead -->
      <div class="footer-ribbon">
        <div class="footer-left">
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#003882"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <span style="font-weight: 700; letter-spacing: 0.3px;">${displayPhone}</span>
          </div>
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="#003882" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6.5L2 7"/></svg>
            </div>
            <span style="font-weight: 500;">${companyEmail}</span>
          </div>
        </div>

        <div class="slanted-divider"></div>

        <div class="footer-right">
          <div class="icon-circle" style="flex-shrink: 0;">
            <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="#003882"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.8" fill="#ffffff"/></svg>
          </div>
          <span class="footer-address-text">${companyAddress}</span>
        </div>
      </div>

    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt - ${bill.invoice_number}</title>
      <style>
        /* Google Fonts removed: unreliable in Vercel/headless Chromium environment */
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        h1, h2, h3, h4, p {
          margin: 0;
          padding: 0;
          font-size: inherit;
          font-weight: normal;
        }

        body {
          font-family: Arial, Helvetica, sans-serif !important;
          color: #292424;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .page-container {
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          padding: 30px 32px 0 32px;
          background: #ffffff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        @media print {
          .page-container {
            page-break-after: always;
            break-after: page;
          }
          .page-container:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }

        .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .watermark img {
          width: 320px;
          max-width: 100%;
          filter: grayscale(100%);
        }

        .content {
          position: relative;
          z-index: 10;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-branding {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-img {
          height: 85px;
          width: auto;
          object-fit: contain;
        }

        .company-title {
          font-size: 23px;
          font-weight: 900;
          color: #111827;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .company-tagline {
          font-size: 9px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 3px;
        }

        .company-address {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
          max-width: 480px;
        }

        .company-contact {
          font-size: 10.5px;
          color: #374151;
          margin-top: 2px;
        }

        .gstin-box {
          font-size: 12px;
          font-weight: 700;
          color: #292424;
          text-align: right;
          white-space: nowrap;
        }

        .divider-blue {
          width: 100%;
          height: 2px;
          background-color: #111827;
          margin-top: 8px;
          margin-bottom: 12px;
        }

        .meta-ribbon {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          margin-bottom: 12px;
        }

        .meta-label {
          color: #4b5563;
          font-weight: 700;
          text-transform: uppercase;
          margin-right: 6px;
        }

        .customer-card {
          border: 1px solid #d1d5db;
          padding: 10px 14px;
          background-color: rgba(255, 255, 255, 0.9);
          margin-bottom: 12px;
          font-size: 10.5px;
        }

        .customer-title {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .customer-name {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          margin-bottom: 2px;
        }

        .table-container {
          border: 1px solid #d1d5db;
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        thead tr {
          background-color: #f3f4f6;
          border-bottom: 1px solid #d1d5db;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        tfoot tr {
          background-color: #f3f4f6;
          border-top: 1px solid #d1d5db;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 24px;
          margin-top: 8px;
        }

        .bank-title {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .bank-details {
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          line-height: 1.5;
        }

        .terms-title {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .terms-list {
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding-left: 14px;
          line-height: 1.4;
        }

        .totals-section {
          padding-left: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding: 1.5px 0;
        }

        .grand-total-row {
          border-top: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
          padding: 5px 0;
          margin: 5px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #292424;
        }

        .amount-words {
          font-size: 10.5px;
          font-weight: normal;
          color: #4b5563;
          margin-top: 2px;
          text-transform: capitalize;
        }

        .signatory-box {
          margin-top: 40px;
          text-align: center;
        }

        .signatory-line {
          width: 200px;
          margin-left: auto;
          border-top: 1px solid #9ca3af;
          padding-top: 4px;
        }

        .footer-ribbon {
          background-color: #003882;
          color: #ffffff;
          padding: 8px 24px;
          margin: 14px -32px 0 -32px;
          display: flex;
          align-items: center;
          font-size: 9.5px;
          font-weight: 500;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
        }

        .footer-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .icon-circle {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .slanted-divider {
          height: 28px;
          width: 2px;
          background-color: #ffffff;
          transform: rotate(25deg);
          margin: 0 16px;
          flex-shrink: 0;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .footer-address-text {
          font-size: 8.8px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          color: #ffffff;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `
}

/**
 * Generate 100% Vector Receipt PDF Buffer via Headless Chrome / Puppeteer
 */
export async function generateReceiptPdfBuffer(bill, settings = {}) {
  const htmlContent = generateReceiptHtml(bill, settings)
  const browser = await launchPuppeteerBrowser()

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * Send Receipt PDF Email via configured SMTP to Customer
 */
export async function sendReceiptEmail(billOrId, param2 = null, param3 = null, param4 = null) {
  try {
    const pool = getPool()

    let bill = null
    let settings = {}
    let targetRecipient = null
    let customPdfBase64 = null
    let billId = null

    if (typeof billOrId === 'object' && billOrId !== null) {
      // Called with (billPayload, settings, targetEmail, customPdfBase64)
      bill = billOrId
      settings = param2 || {}
      targetRecipient = (param3 || bill.customer_email || '').trim()
      customPdfBase64 = param4
      billId = bill.id
    } else {
      // Called with (billId, customRecipient, customPdfBase64)
      billId = billOrId
      targetRecipient = (param2 || '').trim()
      customPdfBase64 = param3

      const [billRows] = await pool.query('SELECT * FROM bills WHERE id = ?', [billId])
      if (billRows.length === 0) {
        return { success: false, message: 'Invoice bill record not found.' }
      }
      bill = billRows[0]

      const [itemRows] = await pool.query(`
      SELECT bi.*, COALESCE(bi.brand, m.brand) AS brand 
      FROM bill_items bi 
      LEFT JOIN materials m ON bi.material_id = m.id 
      WHERE bi.bill_id = ? 
      ORDER BY bi.id ASC
    `, [billId])
      bill.items = itemRows

      const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1')
      settings = settingsRows.length > 0 ? settingsRows[0] : {}

      if (!targetRecipient) {
        targetRecipient = (bill.customer_email || '').trim()
      }
    }

    // 1. Fetch Email Config
    const [configRows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (configRows.length === 0) {
      return { success: false, message: 'Email configurations not found.' }
    }
    const config = configRows[0]

    if (!config.smtp_user || !config.smtp_pass) {
      return { success: false, message: 'SMTP credentials (User/Password) not configured in Settings.' }
    }

    if (!targetRecipient) {
      return { success: false, message: 'No customer email address provided for receipt delivery.' }
    }

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === 1 || config.smtp_secure === true,
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    const formattedDate = new Date(bill.invoice_date || bill.service_date || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedTotal = `${parseFloat(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const companyDisplayName = settings.company_name || config.sender_name || 'Simcha Info Solutions'
    const companyDisplayAddress = settings.address || ''
    const companyDisplayPhone = settings.phone || ''
    const companyDisplayEmail = settings.email || config.sender_email || config.smtp_user || 'simchainfosolutions@gmail.com'

    // 4. Generate Receipt PDF Buffer
    const pdfBuffer = customPdfBase64
      ? Buffer.from(customPdfBase64, 'base64')
      : await generateReceiptPdfBuffer(bill, settings)

    const isService = Boolean(bill.service_number || bill.service_date || bill.type === 'service')
    const receiptNo = bill.receipt_number || bill.invoice_number || bill.service_number || ''

    const vars = {
      company_name: companyDisplayName,
      customer_name: bill.customer_name || '',
      receipt_number: receiptNo,
      invoice_number: bill.invoice_number || bill.service_number || '',
      service_number: bill.service_number || '',
      date: formattedDate,
      total_amount: formattedTotal,
      amount: formattedTotal
    }

    const subjectTemplate = isService ? config.service_receipt_subject : config.sales_receipt_subject
    const bodyTemplate = isService ? config.service_receipt_body : config.sales_receipt_body

    const logoAttachment = getLogoAttachment(settings)
    const subject = renderTemplateText(subjectTemplate, vars)
    const bodyText = renderTemplateText(bodyTemplate, vars)
    const htmlBody = buildBrandedEmailHtml(bodyText, {
      ...settings,
      company_name: companyDisplayName,
      logo_url: settings.logo_url,
      phone: companyDisplayPhone,
      email: config.smtp_user || settings.email,
      address: companyDisplayAddress
    })

    await transporter.sendMail({
      from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
      to: targetRecipient,
      subject: subject,
      text: bodyText,
      html: htmlBody,
      attachments: [
        {
          filename: `Receipt_${receiptNo ? receiptNo.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Receipt'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        },
        ...(logoAttachment ? [logoAttachment] : [])
      ]
    })

    // Update database record if billId exists
    if (billId) {
      try {
        await pool.query('UPDATE bills SET receipt_sent = 1, receipt_sent_at = NOW() WHERE id = ?', [billId])
      } catch {}
    }

    return {
      success: true,
      message: `Payment receipt PDF sent successfully to ${targetRecipient}`
    }
  } catch (error) {
    console.error('❌ Error sending receipt email:', error)
    return {
      success: false,
      message: error.message || 'Failed to dispatch receipt email via SMTP.'
    }
  }
}

/**
 * Generate 100% Exact Pixel-Perfect Multi-Page Quotation HTML Template
 */
export function generateQuotationHtml(quotation, settings = {}) {
  const companyName = settings.company_name || 'SIMCHA INFO SOLUTIONS'
  const companyGstin = settings.gstin || '33GEZPM1178G1ZY'
  const companyPhone = settings.phone || '8122022060'
  const cleanPhone = (companyPhone || '8122022060').toString().trim()
  let displayPhone = cleanPhone
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '')
  if (digitsOnly.length === 10) {
    displayPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2)
    displayPhone = `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  const companyEmail = settings.email || 'simchainfosolutions@gmail.com'
  const companyAddress = settings.address || '7A3, Thulasi Ammal Layout 2nd Street, Lakshmipuram, Peelamedu Post, Coimbatore - 641 004.'
  const signatureUrl = settings.signature_url || settings.signatureUrl || quotation.signature_url || ''
  const bankName = settings.bank_name || 'Canara Bank'
  const bankBranch = settings.branch || 'Peelamedu'
  const bankAccountName = settings.account_name || 'Simcha Info Solutions'
  const bankAccountNo = settings.account_no || '120041754011'
  const bankIfsc = settings.ifsc_code || 'CNRB0002732'

  let termsList = []
  const targetTerms = settings.quotation_terms || settings.terms_conditions
  if (Array.isArray(targetTerms)) {
    termsList = targetTerms
  } else if (typeof targetTerms === 'string') {
    try {
      termsList = JSON.parse(targetTerms)
    } catch {
      termsList = [targetTerms]
    }
  }
  if (!Array.isArray(termsList)) {
    termsList = []
  }

  const items = Array.isArray(quotation.items) ? quotation.items : []
  const isGstQuotation = quotation.quotation_type === 'GST' || (!quotation.quotation_type && parseFloat(quotation.total_tax || 0) > 0)
  const isIntraState = !quotation.place_of_supply || quotation.place_of_supply.includes('33') || quotation.place_of_supply.toLowerCase().includes('tamil nadu')
  const isServiceQuotation = Boolean(quotation.is_service || quotation.service_number)

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)
  const totalTaxAmt = isGstQuotation ? items.reduce((sum, it) => sum + (parseFloat(it.tax_amount) || 0), 0) : 0
  const effectiveTotalTax = parseFloat(quotation.total_tax || 0) || totalTaxAmt || 0
  const isGst = isGstQuotation || effectiveTotalTax > 0
  const cgstRateVal = parseFloat(quotation.cgst_rate || settings.cgst_rate || 9).toFixed(2)
  const sgstRateVal = parseFloat(quotation.sgst_rate || settings.sgst_rate || 9).toFixed(2)
  const igstRateVal = parseFloat(quotation.igst_rate || settings.igst_rate || 18).toFixed(2)
  const cgstAmountVal = parseFloat(quotation.cgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const sgstAmountVal = parseFloat(quotation.sgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const igstAmountVal = parseFloat(quotation.igst_amount) || (!isIntraState ? effectiveTotalTax : 0)
  const taxableAmountVal = quotation.taxable_amount || (parseFloat(quotation.total_amount || 0) - effectiveTotalTax)
  const totalGrossAmt = items.reduce((sum, it) => sum + (parseFloat(it.amount) || (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0))), 0)
  const totalDiscountSavings = items.reduce((sum, it) => sum + ((parseFloat(it.discount_amount) || 0) * (parseFloat(it.quantity) || 1)), 0)
  const totalGrossOrigAmt = items.reduce((sum, it) => sum + (((parseFloat(it.original_rate) || parseFloat(it.rate) || 0)) * (parseFloat(it.quantity) || 1)), 0) || totalGrossAmt

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatQty = (qty) => {
    const num = parseFloat(qty) || 0
    return num % 1 === 0 ? parseInt(num, 10) : num
  }

  // Assets
  const logoDataUri = getBase64Image('../../../frontend/src/assets/Logo/Logo-bg-remove.png')
  const watermarkDataUri = getBase64Image('../../../frontend/src/assets/Logo/Favicon.jpeg')

  const paginatedPages = paginateInvoiceItems(items)

  const renderItemRow = (item, index, page) => {
    if (isServiceQuotation) {
      return `
        <tr>
          <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${(page?.startIndex || 0) + index + 1}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
            <div style="font-weight: 700; font-size: 10.5px; color: #292424;">
              ${item.product_name || item.item_name || item.name}
              ${item.brand_model ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.brand_model})</span>` : ''}
            </div>
            ${item.serial_number && item.serial_number.trim() && item.serial_number.trim() !== (item.brand_model || '').trim() ? `<div style="font-size: 10px; font-weight: 700; color: #111827; margin-top: 2px;">S/N: ${item.serial_number}</div>` : ''}
            ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
          </td>
          <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px; color: #292424;">
            <div>${item.issue_description || item.reported_issue || 'General Service & Repair'}</div>
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${formatQty(item.quantity)}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
            ${parseFloat(item.rate || item.original_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
            ${isGstQuotation && parseFloat(item.tax_amount || 0) > 0 ? parseFloat(item.tax_amount).toFixed(2) : '—'}
          </td>
          <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: 700; color: #292424; vertical-align: top;">
            ${parseFloat(item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
    }
    return `
      <tr>
        <td style="padding: 7px 6px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${(page?.startIndex || 0) + index + 1}
        </td>
        <td style="padding: 7px 12px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 10.5px;">
          <div style="font-weight: normal; font-size: 10.5px; color: #292424;">
            ${item.item_name || item.name}
            ${item.unit ? `<span style="font-size: 10.5px; font-weight: normal; color: #4b5563; margin-left: 4px;">(${item.unit})</span>` : ''}
          </div>
          ${item.brand && item.brand.trim() && item.brand.trim() !== '—' ? `<div style="font-size: 10px; color: #4b5563; font-weight: normal; margin-top: 1px;">Brand: ${item.brand}</div>` : ''}
          ${item.serial_number && item.serial_number.trim() ? `<div style="font-size: 10.5px; font-weight: 700; color: #1f2937; margin-top: 2px;">S/N: ${item.serial_number}</div>` : ''}
          ${item.remarks ? `<div style="font-size: 10px; color: #4b5563; font-style: italic; margin-top: 2px;">Note: ${item.remarks}</div>` : ''}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${item.hsn_code || '-'}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${formatQty(item.quantity)} Unit
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="padding: 7px 8px; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #374151; vertical-align: top;">
          ${isGstQuotation && parseFloat(item.tax_amount || 0) > 0 ? `${parseFloat(item.tax_amount || 0).toFixed(2)}` : '0.00'}
        </td>
        <td style="padding: 7px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 10.5px; font-weight: normal; color: #292424; vertical-align: top;">
          ${parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    `
  }

  const pagesHtml = paginatedPages.map((page) => `
    <div class="page-container" style="page-break-after: ${page.pageIndex < page.totalPages ? 'always' : 'avoid'}; break-after: ${page.pageIndex < page.totalPages ? 'page' : 'avoid'};">
      
      <!-- Watermark -->
      <div class="watermark">
        ${watermarkDataUri ? `<img src="${watermarkDataUri}" alt="Watermark" />` : ''}
      </div>

      <div class="content">
        
        ${page.isFirstPage ? `
          <!-- PAGE 1: Full Official Quotation Letterhead Header -->
          ${page.totalPages > 1 ? `
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">
                Page ${page.pageIndex} of ${page.totalPages}
              </span>
            </div>
          ` : ''}

          <div class="header-top">
            <div class="logo-branding">
              ${logoDataUri ? `<img src="${logoDataUri}" class="logo-img" alt="Logo" />` : ''}
              <div>
                <h1 class="company-title" style="color: #111827 !important; font-size: 23px; font-weight: 900; line-height: 1.1; letter-spacing: -0.5px; font-family: 'Segoe UI', Arial, sans-serif !important;">${companyName}</h1>
                <p class="company-tagline">IT CONSULTING | HARDWARE &amp; SOFTWARE SOLUTIONS | SALES &amp; SERVICE</p>
                <p class="company-address">${companyAddress}</p>
                <p class="company-contact"><strong>Mobile:</strong> ${companyPhone} &nbsp;|&nbsp; <strong>Email:</strong> ${companyEmail}</p>
              </div>
            </div>
            <div class="gstin-box">
              <span style="color: #6b7280; font-family: Arial, Helvetica, sans-serif; font-size: 11px;">GSTIN: </span>${companyGstin}
            </div>
          </div>

          <div class="divider-blue" style="width: 100%; border-bottom: 2.5px solid #111827 !important; height: 0px; margin-top: 8px; margin-bottom: 12px;"></div>

          <!-- Meta Ribbon -->
          <div class="meta-ribbon" style="background-color: #f3f4f6 !important; border: 1px solid #d1d5db !important; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #292424; margin-bottom: 12px;">
            <div>
              <span class="meta-label">QUOTATION NUMBER:</span>
              <span style="font-size: 12px; font-weight: 700; color: #111827;">${quotation.quotation_number}</span>
            </div>
            <div>
              <span class="meta-label">DATE:</span>
              <span style="font-size: 11px; font-weight: 700;">${formatDate(quotation.quotation_date)}</span>
            </div>
          </div>

          <!-- Customer Details: Two Columns (QUOTATION FOR & DELIVERY ADDRESS) -->
          <div class="customer-card">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Left: QUOTATION FOR -->
              <div style="border-right: 1px solid #e5e7eb; padding-right: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <div class="customer-title">CUSTOMER DETAILS</div>
                    <div class="customer-name">${quotation.customer_name}</div>
                  </div>
                  <span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a; background: #dbeafe; border: 1px solid #bfdbfe; padding: 2px 6px;">
                    OFFICIAL ESTIMATE
                  </span>
                </div>
                ${quotation.customer_address ? `<div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">${quotation.customer_address}</div>` : ''}
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  ${quotation.customer_phone ? `<div><strong>Mobile:</strong> <span>${quotation.customer_phone}</span></div>` : ''}
                  ${quotation.customer_email ? `<div><strong>Email:</strong> <span>${quotation.customer_email}</span></div>` : ''}
                  ${quotation.customer_gstin ? `<div><strong>Client GSTIN:</strong> <span style="font-weight: 700;">${quotation.customer_gstin}</span></div>` : ''}
                </div>
              </div>

              <!-- Right: DELIVERY / SITE ADDRESS -->
              <div>
                <div class="customer-title">DELIVERY / SITE ADDRESS</div>
                <div style="color: #374151; margin-top: 3px; font-size: 10.5px; font-weight: normal; line-height: 1.3;">
                  ${quotation.same_as_billing || !quotation.delivery_address || quotation.delivery_address.trim() === ''
                    ? (quotation.customer_address ? quotation.customer_address : 'Same as billing address')
                    : quotation.delivery_address}
                </div>
                <div style="margin-top: 4px; color: #374151; font-size: 10.5px; font-weight: normal; line-height: 1.4;">
                  <div><strong>Place of Supply:</strong> ${quotation.place_of_supply || '33-Tamil Nadu'}</div>
                  ${quotation.valid_until ? `<div><strong>Valid Until:</strong> ${formatDate(quotation.valid_until)}</div>` : ''}
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- PAGE 2+: Compact Mini Letterhead Header -->
          <div style="border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">
                OFFICIAL QUOTATION
              </span>
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #111827; letter-spacing: 0.5px;">
                Quotation #${quotation.quotation_number} • Page ${page.pageIndex} of ${page.totalPages}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${logoDataUri ? `<img src="${logoDataUri}" style="height: 38px; width: auto; object-fit: contain;" alt="Logo" />` : ''}
                <div>
                  <div style="font-size: 16px; font-weight: 900; color: #111827; line-height: 1;">${companyName}</div>
                  <div style="font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-top: 2px;">
                    PRICE ESTIMATE &amp; QUOTATION
                  </div>
                </div>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: 700;">
                <div><span style="color: #6b7280; font-weight: 500;">Date: </span>${formatDate(quotation.quotation_date)}</div>
                <div style="font-size: 10.5px; color: #4b5563;">GSTIN: ${companyGstin}</div>
              </div>
            </div>
          </div>
        `}

        <!-- Line Items Table -->
        <div class="table-container">
          <table>
            <thead>
              ${isServiceQuotation ? `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 5%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">#</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 30%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">PRODUCT &amp; MODEL</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 27%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">REPORTED ISSUE / SERVICE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 8%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 10%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              ` : `
                <tr>
                  <th style="padding: 8px 6px; border-right: 1px solid #d1d5db; width: 6%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">S.NO</th>
                  <th style="padding: 8px 12px; border-right: 1px solid #d1d5db; width: 38%; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase;">ITEMS</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 12%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">HSN/SAC</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 10%; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase;">QTY</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">RATE</th>
                  <th style="padding: 8px 8px; border-right: 1px solid #d1d5db; width: 11%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">TAX</th>
                  <th style="padding: 8px 12px; width: 12%; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">AMOUNT</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${page.items.map((item, idx) => renderItemRow(item, idx, page)).join('')}
            </tbody>
            ${page.showSummary ? `
              <tfoot>
                ${isServiceQuotation ? `
                  <tr>
                    <td colspan="3" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase;">TOTAL ITEMS: ${quotation.items?.length || page.items?.length || 1}</td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)}</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ` : `
                  <tr>
                    <td colspan="2" style="padding: 8px 12px; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; text-transform: uppercase;">SUB TOTAL</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: center; font-size: 11px; font-weight: 700;">${formatQty(totalQty)} Unit</td>
                    <td style="border-right: 1px solid #d1d5db;"></td>
                    <td style="padding: 8px 8px; border-right: 1px solid #d1d5db; text-align: right; font-size: 11px; font-weight: 700;">${totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700;">${totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `}
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${page.showSummary ? `
          <!-- Bottom Split -->
          <div class="bottom-grid">
            
            <!-- Left: Terms & Conditions -->
            <div>
              ${termsList && termsList.length > 0 ? `
                <div>
                  <div class="terms-title">TERMS &amp; CONDITIONS</div>
                  <ol class="terms-list">
                    ${termsList.map(t => `<li>${t}</li>`).join('')}
                  </ol>
                </div>
              ` : ''}
            </div>

            <!-- Right: Totals & Signatory -->
            <div class="totals-section">
              <div>
                <div class="totals-row" style="font-size: 10.5px; color: #4b5563;">
                  <span>Gross Amount</span>
                  <span>${parseFloat(totalGrossOrigAmt || quotation.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${totalDiscountSavings > 0 ? `
                  <div class="totals-row" style="font-size: 10.5px; font-weight: bold; color: #047857;">
                    <span>Discount Savings</span>
                    <span>- ${parseFloat(totalDiscountSavings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}

                <div class="totals-row">
                  <span>Taxable Amount</span>
                  <span style="font-weight: normal;">${parseFloat(taxableAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${isGst && effectiveTotalTax > 0 ? (
                  isIntraState ? `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>CGST (${cgstRateVal}%)</span>
                      <span>${parseFloat(cgstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>SGST (${sgstRateVal}%)</span>
                      <span>${parseFloat(sgstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ` : `
                    <div class="totals-row" style="font-size: 10.5px;">
                      <span>IGST (${igstRateVal}%)</span>
                      <span>${parseFloat(igstAmountVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  `
                ) : ''}

                ${quotation.round_off && parseFloat(quotation.round_off) !== 0 ? `
                  <div class="totals-row" style="font-size: 10.5px; color: #6b7280;">
                    <span>Round Off</span>
                    <span>${quotation.round_off > 0 ? `+${quotation.round_off}` : `-${Math.abs(quotation.round_off)}`}</span>
                  </div>
                ` : ''}

                <div class="grand-total-row">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Quotation Total</span>
                  <span style="font-size: 15px; font-weight: 700;">${parseFloat(quotation.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                ${quotation.amount_in_words ? `
                  <div class="amount-words">
                    <strong style="font-size: 10.5px; font-weight: 700;">Estimated Amount (in words):</strong>
                    <div style="font-style: italic; color: #292424; font-size: 10.5px; font-weight: normal; margin-top: 2px;">${quotation.amount_in_words}</div>
                  </div>
                ` : ''}
              </div>

              <!-- Signatory -->
              <div class="signatory-box" style="margin-top: ${signatureUrl ? '10px' : '30px'}; text-align: center;">
                ${signatureUrl ? `
                  <div style="display: flex; justify-content: center; align-items: center; height: 38px; margin-bottom: 3px;">
                    <img src="${signatureUrl}" alt="Authorized Signature" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto;" />
                  </div>
                ` : ''}
                <div class="signatory-line" style="width: 100%; max-width: 200px; margin: 0 auto; border-top: 1px solid #9ca3af; padding-top: 3px;">
                  <p style="font-size: 9.5px; color: #4b5563;">Authorized signatory for</p>
                  <p style="font-size: 11px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">${companyName}</p>
                </div>
              </div>

            </div>

          </div>
        ` : ''}

      </div>

      <!-- Footer Ribbon Matching Brand Letterhead -->
      <div class="footer-ribbon">
        <div class="footer-left">
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#003882"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <span style="font-weight: 700; letter-spacing: 0.3px;">${displayPhone}</span>
          </div>
          <div class="footer-pill">
            <div class="icon-circle">
              <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="#003882" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6.5L2 7"/></svg>
            </div>
            <span style="font-weight: 500;">${companyEmail}</span>
          </div>
        </div>

        <div class="slanted-divider"></div>

        <div class="footer-right">
          <div class="icon-circle" style="flex-shrink: 0;">
            <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="#003882"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.8" fill="#ffffff"/></svg>
          </div>
          <span class="footer-address-text">${companyAddress}</span>
        </div>
      </div>

    </div>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Quotation - ${quotation.quotation_number}</title>
      <style>
        /* Google Fonts removed: unreliable in Vercel/headless Chromium environment */
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        h1, h2, h3, h4, p {
          margin: 0;
          padding: 0;
          font-size: inherit;
          font-weight: normal;
        }

        body {
          font-family: Arial, Helvetica, sans-serif !important;
          color: #292424;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .page-container {
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          padding: 30px 32px 0 32px;
          background: #ffffff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        @media print {
          .page-container {
            page-break-after: always;
            break-after: page;
          }
          .page-container:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
        }

        .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
        }

        .watermark img {
          width: 320px;
          max-width: 100%;
          filter: grayscale(100%);
        }

        .content {
          position: relative;
          z-index: 10;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-branding {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .logo-img {
          height: 85px;
          width: auto;
          object-fit: contain;
        }

        .company-title {
          font-size: 23px;
          font-weight: 900;
          color: #111827;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .company-tagline {
          font-size: 9px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 3px;
        }

        .company-address {
          font-size: 10.5px;
          color: #4b5563;
          margin-top: 2px;
          max-width: 480px;
        }

        .company-contact {
          font-size: 10.5px;
          color: #374151;
          margin-top: 2px;
        }

        .gstin-box {
          font-size: 12px;
          font-weight: 700;
          color: #292424;
          text-align: right;
          white-space: nowrap;
        }

        .divider-blue {
          width: 100%;
          height: 2px;
          background-color: #111827;
          margin-top: 8px;
          margin-bottom: 12px;
        }

        .meta-ribbon {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          margin-bottom: 12px;
        }

        .meta-label {
          color: #4b5563;
          font-weight: 700;
          text-transform: uppercase;
          margin-right: 6px;
        }

        .customer-card {
          border: 1px solid #d1d5db;
          padding: 10px 14px;
          background-color: rgba(255, 255, 255, 0.9);
          margin-bottom: 12px;
          font-size: 10.5px;
        }

        .customer-title {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .customer-name {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          margin-bottom: 2px;
        }

        .table-container {
          border: 1px solid #d1d5db;
          margin-bottom: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
        }

        thead tr {
          background-color: #f3f4f6;
          border-bottom: 1px solid #d1d5db;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        tfoot tr {
          background-color: #f3f4f6;
          border-top: 1px solid #d1d5db;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 7fr 5fr;
          gap: 24px;
          margin-top: 8px;
        }

        .bank-title, .terms-title {
          font-size: 11px;
          font-weight: 700;
          color: #292424;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .bank-details {
          font-size: 10.5px;
          font-weight: normal;
          color: #1f2937;
          line-height: 1.5;
        }

        .terms-list {
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding-left: 14px;
          line-height: 1.4;
        }

        .totals-section {
          padding-left: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: normal;
          color: #374151;
          padding: 1.5px 0;
        }

        .grand-total-row {
          border-top: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
          padding: 5px 0;
          margin: 5px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #292424;
        }

        .amount-words {
          font-size: 10.5px;
          font-weight: normal;
          color: #4b5563;
          margin-top: 2px;
          text-transform: capitalize;
        }

        .signatory-box {
          margin-top: 40px;
          text-align: center;
        }

        .signatory-line {
          width: 200px;
          margin-left: auto;
          border-top: 1px solid #9ca3af;
          padding-top: 4px;
        }

        .footer-ribbon {
          background-color: #003882;
          color: #ffffff;
          padding: 8px 24px;
          margin: 14px -32px 0 -32px;
          display: flex;
          align-items: center;
          font-size: 9.5px;
          font-weight: 500;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
        }

        .footer-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .icon-circle {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .slanted-divider {
          height: 28px;
          width: 2px;
          background-color: #ffffff;
          transform: rotate(25deg);
          margin: 0 16px;
          flex-shrink: 0;
        }

        .footer-right {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .footer-address-text {
          font-size: 8.8px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          color: #ffffff;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `
}

/**
 * Generate 100% Vector Quotation PDF Buffer via Headless Chrome / Puppeteer
 */
export async function generateQuotationPdfBuffer(quotation, settings = {}) {
  const htmlContent = generateQuotationHtml(quotation, settings)
  const browser = await launchPuppeteerBrowser()

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * Send Quotation PDF Email via configured SMTP
 */
export async function sendQuotationEmail(quotationId, customRecipient = null, customPdfBase64 = null) {
  try {
    const pool = getPool()

    // 1. Fetch Email Config
    const [configRows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (configRows.length === 0) {
      return { success: false, message: 'Email configurations not found.' }
    }
    const config = configRows[0]

    if (!config.smtp_user || !config.smtp_pass) {
      return { success: false, message: 'SMTP credentials not configured in Settings.' }
    }

    // 2. Fetch Quotation Details & Settings
    const [quotationRows] = await pool.query('SELECT * FROM quotations WHERE id = ?', [quotationId])
    if (quotationRows.length === 0) {
      return { success: false, message: 'Quotation record not found.' }
    }
    const quotation = quotationRows[0]

    const [itemRows] = await pool.query(`
      SELECT qi.*, COALESCE(qi.brand, m.brand) AS brand 
      FROM quotation_items qi 
      LEFT JOIN materials m ON qi.material_id = m.id 
      WHERE qi.quotation_id = ? 
      ORDER BY qi.id ASC
    `, [quotationId])
    quotation.items = itemRows

    const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1')
    const settings = settingsRows.length > 0 ? settingsRows[0] : {}

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === 1 || config.smtp_secure === true,
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    const formattedDate = new Date(quotation.quotation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedTotal = `${parseFloat(quotation.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const companyDisplayName = settings.company_name || config.sender_name || 'Simcha Info Solutions'
    const companyDisplayAddress = settings.address || ''
    const companyDisplayPhone = settings.phone || ''
    const companyDisplayEmail = settings.email || config.sender_email || config.smtp_user || 'simchainfosolutions@gmail.com'

    const vars = {
      company_name: companyDisplayName,
      customer_name: quotation.customer_name || '',
      quotation_number: quotation.quotation_number || '',
      date: formattedDate,
      total_amount: formattedTotal,
      amount: formattedTotal
    }

    const logoAttachment = getLogoAttachment(settings)
    const templateSubject = renderTemplateText(config.sales_quotation_subject, vars)
    const templateBody = renderTemplateText(config.sales_quotation_body, vars)
    const htmlBody = buildBrandedEmailHtml(templateBody, {
      ...settings,
      company_name: companyDisplayName,
      logo_url: settings.logo_url,
      phone: companyDisplayPhone,
      email: companyDisplayEmail,
      address: companyDisplayAddress
    })

    const pdfBuffer = customPdfBase64
      ? Buffer.from(customPdfBase64, 'base64')
      : await generateQuotationPdfBuffer(quotation, settings)

    // Case A: Custom single recipient
    if (customRecipient) {
      await transporter.sendMail({
        from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
        to: customRecipient.trim(),
        subject: templateSubject,
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Quotation_${(quotation.quotation_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })

      await pool.query('UPDATE quotations SET email_sent = 1, email_sent_at = NOW(), quotation_status = CASE WHEN quotation_status = "Draft" THEN "Sent" ELSE quotation_status END WHERE id = ?', [quotationId])

      return {
        success: true,
        message: `Quotation PDF email sent successfully to ${customRecipient}`
      }
    }

    // Case B: Auto-dispatch to Customer and Admin
    const dispatchedTo = []
    const customerEmail = (quotation.customer_email || '').trim()

    if (customerEmail) {
      await transporter.sendMail({
        from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
        to: customerEmail,
        subject: templateSubject,
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Quotation_${(quotation.quotation_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })
      dispatchedTo.push(`Customer (${customerEmail})`)
    }

    const adminEmail = (config.recipient_email || config.smtp_user || '').trim()
    if (adminEmail && adminEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      await transporter.sendMail({
        from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
        to: adminEmail,
        subject: templateSubject ? `${templateSubject} (Admin Copy)` : '',
        text: templateBody,
        html: htmlBody,
        attachments: [
          {
            filename: `Quotation_${(quotation.quotation_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          },
          ...(logoAttachment ? [logoAttachment] : [])
        ]
      })
      dispatchedTo.push(`Admin (${adminEmail})`)
    }

    await pool.query('UPDATE quotations SET email_sent = 1, email_sent_at = NOW(), quotation_status = CASE WHEN quotation_status = "Draft" THEN "Sent" ELSE quotation_status END WHERE id = ?', [quotationId])

    return {
      success: true,
      message: `Quotation emailed to: ${dispatchedTo.length > 0 ? dispatchedTo.join(', ') : 'No recipient email found'}`
    }
  } catch (error) {
    console.error('❌ Error sending quotation email:', error)
    return {
      success: false,
      message: error.message || 'Failed to dispatch quotation email via SMTP.'
    }
  }
}

/**
 * Send Service Quotation PDF Email via configured SMTP
 */
export async function sendServiceQuotationEmail(serviceId, customRecipient = null, customPdfBase64 = null) {
  try {
    const pool = getPool()

    // 1. Fetch Email Config
    const [configRows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (configRows.length === 0) {
      return { success: false, message: 'Email configurations not found.' }
    }
    const config = configRows[0]

    if (!config.smtp_user || !config.smtp_pass) {
      return { success: false, message: 'SMTP credentials not configured in Settings.' }
    }

    // 2. Fetch Service Details & Settings
    const [serviceRows] = await pool.query('SELECT * FROM service_bills WHERE id = ?', [serviceId])
    if (serviceRows.length === 0) {
      return { success: false, message: 'Service record not found.' }
    }
    const service = serviceRows[0]

    const [itemRows] = await pool.query('SELECT * FROM service_bill_items WHERE service_bill_id = ? ORDER BY id ASC', [serviceId])

    // Map items for quotation template
    const mappedItems = itemRows.map(it => ({
      ...it,
      item_name: it.product_name || it.item_name || 'Service Product',
      product_name: it.product_name || it.item_name || 'Service Product',
      brand_model: it.brand_model || '',
      description: it.issue_description || it.brand_model || '',
      quantity: parseFloat(it.quantity) || 1,
      unit: it.unit || 'NOS',
      rate: parseFloat(it.rate) || 0,
      amount: parseFloat(it.amount) || 0,
      tax_rate: parseFloat(it.tax_rate) || 18,
      tax_amount: parseFloat(it.tax_amount) || 0,
      hsn_code: it.hsn_code || null,
      serial_number: (it.has_serial && it.serial_number) ? it.serial_number : (it.serial_number && it.serial_number.trim() !== (it.brand_model || '').trim() ? it.serial_number : '')
    }))

    const quotationData = {
      ...service,
      is_service: true,
      quotation_number: service.service_number,
      quotation_date: service.service_date,
      valid_until: null,
      items: mappedItems
    }

    const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1')
    const settings = settingsRows.length > 0 ? settingsRows[0] : {}

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === 1 || config.smtp_secure === true,
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    const formattedDate = new Date(service.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedTotal = `${parseFloat(service.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const companyDisplayName = settings.company_name || config.sender_name || 'Simcha Info Solutions'
    const companyDisplayAddress = settings.address || ''
    const companyDisplayPhone = settings.phone || ''
    const companyDisplayEmail = settings.email || config.sender_email || config.smtp_user || 'simchainfosolutions@gmail.com'

    const vars = {
      company_name: companyDisplayName,
      customer_name: service.customer_name || '',
      quotation_number: service.service_number || '',
      service_number: service.service_number || '',
      date: formattedDate,
      total_amount: formattedTotal,
      amount: formattedTotal
    }

    const logoAttachment = getLogoAttachment(settings)
    const templateSubject = renderTemplateText(config.service_quotation_subject, vars)
    const templateBody = renderTemplateText(config.service_quotation_body, vars)
    const htmlBody = buildBrandedEmailHtml(templateBody, {
      ...settings,
      company_name: companyDisplayName,
      logo_url: settings.logo_url,
      phone: companyDisplayPhone,
      email: companyDisplayEmail,
      address: companyDisplayAddress
    })

    const pdfBuffer = customPdfBase64
      ? Buffer.from(customPdfBase64, 'base64')
      : await generateQuotationPdfBuffer(quotationData, settings)

    // Send to recipient
    const recipient = (customRecipient || service.customer_email || '').trim()
    if (!recipient) {
      return { success: false, message: 'No customer recipient email provided.' }
    }

    await transporter.sendMail({
      from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
      to: recipient,
      subject: templateSubject,
      text: templateBody,
      html: htmlBody,
      attachments: [
        {
          filename: `Service_Quotation_${(service.service_number || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        },
        ...(logoAttachment ? [logoAttachment] : [])
      ]
    })

    // Automatically update service_status to 'Quotations' from 'Received' or current
    await pool.query(`
      UPDATE service_bills SET 
        quotation_email_sent = 1,
        quotation_email_sent_at = NOW(),
        service_status = 'Quotations',
        updated_at = NOW()
      WHERE id = ?
    `, [serviceId])

    return {
      success: true,
      message: `Service quotation PDF sent successfully to ${recipient}`,
      newStatus: 'Quotations'
    }
  } catch (error) {
    console.error('❌ Error sending service quotation email:', error)
    return {
      success: false,
      message: error.message || 'Failed to dispatch service quotation email via SMTP.'
    }
  }
}

/**
 * Send Service Invoice PDF Email via configured SMTP
 */
export async function sendServiceInvoiceEmail(serviceId, customRecipient = null, customPdfBase64 = null) {
  try {
    const pool = getPool()

    // 1. Fetch Email Config
    const [configRows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (configRows.length === 0) {
      return { success: false, message: 'Email configurations not found.' }
    }
    const config = configRows[0]

    if (!config.smtp_user || !config.smtp_pass) {
      return { success: false, message: 'SMTP credentials not configured in Settings.' }
    }

    // 2. Fetch Service Details & Settings
    const [serviceRows] = await pool.query('SELECT * FROM service_bills WHERE id = ?', [serviceId])
    if (serviceRows.length === 0) {
      return { success: false, message: 'Service record not found.' }
    }
    const service = serviceRows[0]

    const [settingsRows] = await pool.query('SELECT * FROM settings WHERE id = 1')
    const settings = settingsRows.length > 0 ? settingsRows[0] : {}

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: config.smtp_host || 'smtp.gmail.com',
      port: parseInt(config.smtp_port, 10) || 465,
      secure: config.smtp_port === 465 || config.smtp_secure === 1 || config.smtp_secure === true,
      auth: {
        user: config.smtp_user.trim(),
        pass: config.smtp_pass.trim()
      }
    })

    const formattedDate = new Date(service.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const formattedTotal = `${parseFloat(service.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const companyDisplayName = settings.company_name || config.sender_name || 'Simcha Info Solutions'
    const companyDisplayAddress = settings.address || ''
    const companyDisplayPhone = settings.phone || ''
    const companyDisplayEmail = settings.email || config.sender_email || config.smtp_user || 'simchainfosolutions@gmail.com'

    const vars = {
      company_name: companyDisplayName,
      customer_name: service.customer_name || '',
      invoice_number: service.service_number || '',
      service_number: service.service_number || '',
      date: formattedDate,
      total_amount: formattedTotal,
      amount: formattedTotal
    }

    const logoAttachment = getLogoAttachment(settings)
    const templateSubject = renderTemplateText(config.service_invoice_subject, vars)
    const templateBody = renderTemplateText(config.service_invoice_body, vars)
    const htmlBody = buildBrandedEmailHtml(templateBody, {
      ...settings,
      company_name: companyDisplayName,
      logo_url: settings.logo_url,
      phone: companyDisplayPhone,
      email: companyDisplayEmail,
      address: companyDisplayAddress
    })

    const recipient = (customRecipient || service.customer_email || '').trim()
    if (!recipient) {
      return { success: false, message: 'Customer email address is not specified.' }
    }

    // Attachments
    const attachments = [
      ...(logoAttachment ? [logoAttachment] : [])
    ]
    if (customPdfBase64) {
      const cleanBase64 = customPdfBase64.replace(/^data:application\/pdf;base64,/, '')
      const fileName = `ServiceInvoice_${(service.service_number || 'Service').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      attachments.push({
        filename: fileName,
        content: Buffer.from(cleanBase64, 'base64'),
        contentType: 'application/pdf'
      })
    }

    await transporter.sendMail({
      from: `"${config.sender_name || companyDisplayName}" <${config.smtp_user}>`,
      to: recipient,
      subject: templateSubject,
      text: templateBody,
      html: htmlBody,
      attachments
    })

    // Mark invoice_email_sent in DB
    await pool.query(`
      UPDATE service_bills SET 
        invoice_email_sent = 1,
        invoice_email_sent_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [serviceId])

    return {
      success: true,
      message: `Service Invoice PDF emailed successfully to ${recipient}`
    }
  } catch (error) {
    console.error('❌ Error sending service invoice email:', error)
    return {
      success: false,
      message: error.message || 'Failed to dispatch service invoice email via SMTP.'
    }
  }
}




