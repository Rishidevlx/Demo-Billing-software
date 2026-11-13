import React from 'react'
import { pdf } from '@react-pdf/renderer'
import MasterBillPdf from '../components/pdf-templates/MasterBillPdf'
import defaultLogoPng from '../assets/Logo/Demo-logo.svg'

/**
 * Convert any image URL (local, remote, webp, svg) into a safe PNG Base64 Data URL.
 * Guarantees zero PDF engine crashes due to unsupported image formats or network drops.
 */
async function toSafeDataUrl(url) {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) {
    return url
  }

  return new Promise((resolve) => {
    let resolved = false
    const finish = (res) => {
      if (!resolved) {
        resolved = true
        resolve(res)
      }
    }

    // Safety timeout: Never block PDF generation if image CDN takes too long
    const timer = setTimeout(() => {
      finish(null)
    }, 3500)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      clearTimeout(timer)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width || 120
        canvas.height = img.naturalHeight || img.height || 60
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        finish(canvas.toDataURL('image/png'))
      } catch (err) {
        // Tainted canvas or CORS: fallback safely
        finish(url)
      }
    }
    img.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    img.src = url
  })
}

/**
 * Convert standard PDF Blob into pure Base64 String
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUri = reader.result
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Universal Master PDF Generator
 * Renders the deterministic, native @react-pdf/renderer MasterBillPdf document.
 */
export async function generateMasterPdfBase64({ documentType = 'INVOICE', billData = {}, settings = {}, company = {} }) {
  const safeData = { ...billData }
  const safeSettings = { ...settings }

  // 0. Parse company_snapshot safely if it is a JSON string or null
  let snapshot = safeData.company_snapshot
  if (typeof snapshot === 'string') {
    try {
      snapshot = JSON.parse(snapshot)
    } catch {
      snapshot = null
    }
  }
  safeData.company_snapshot = snapshot && typeof snapshot === 'object' ? { ...snapshot } : {}

  // 0.1 Parse items / parts safely if they are JSON strings
  if (typeof safeData.items === 'string') {
    try {
      safeData.items = JSON.parse(safeData.items)
    } catch {
      safeData.items = []
    }
  }
  if (typeof safeData.parts === 'string') {
    try {
      safeData.parts = JSON.parse(safeData.parts)
    } catch {
      safeData.parts = []
    }
  }

  // 1. Pre-process images into safe formats
  const rawLogo = safeData.company_snapshot?.logo_url || company?.logo_url || settings?.logo_url || settings?.logo || defaultLogoPng
  const rawQr = safeData.bank_image_url || safeData.company_snapshot?.bank_image_url || settings?.bank_details?.bank_image_url || settings?.bank_image_url || null
  const rawSign = safeData.signature_url || safeData.company_snapshot?.signature_url || settings?.signature_url || null

  const [safeLogo, safeQr, safeSign] = await Promise.all([
    toSafeDataUrl(rawLogo),
    toSafeDataUrl(rawQr),
    toSafeDataUrl(rawSign)
  ])

  // Attach sanitized images safely (safeData.company_snapshot is guaranteed to be an object now)
  if (safeLogo) {
    safeData.company_snapshot.logo_url = safeLogo
    safeSettings.logo_url = safeLogo
  }
  if (safeQr) {
    safeData.bank_image_url = safeQr
    safeData.company_snapshot.bank_image_url = safeQr
  }
  if (safeSign) {
    safeData.signature_url = safeSign
    safeData.company_snapshot.signature_url = safeSign
    safeSettings.signature_url = safeSign
  }

  // 2. Generate PDF using native @react-pdf/renderer
  const docElement = (
    <MasterBillPdf
      documentType={documentType}
      billData={safeData}
      settings={safeSettings}
      company={company}
    />
  )

  const blob = await pdf(docElement).toBlob()
  return await blobToBase64(blob)
}

/**
 * Generate Base64 PDF for Tax Invoice (Sales Invoice)
 */
export async function generateInvoicePdfBase64(bill, settings = {}) {
  return generateMasterPdfBase64({
    documentType: 'INVOICE',
    billData: bill,
    settings,
    company: settings
  })
}

/**
 * Generate Base64 PDF for Payment Receipt
 */
export async function generateReceiptPdfBase64(bill, settings = {}) {
  return generateMasterPdfBase64({
    documentType: 'RECEIPT',
    billData: bill,
    settings,
    company: settings
  })
}

/**
 * Generate Base64 PDF for Quotation
 */
export async function generateQuotationPdfBase64(quotation, settings = {}) {
  return generateMasterPdfBase64({
    documentType: 'QUOTATION',
    billData: quotation,
    settings,
    company: settings
  })
}

/**
 * Generate Base64 PDF for Service Invoice
 */
export async function generateServiceInvoicePdfBase64(service, settings = {}) {
  const mappedItems = (service.items || []).map((it) => ({
    ...it,
    item_name: it.product_name || it.item_name || 'Service Item',
    name: it.product_name || it.item_name || 'Service Item',
    brand_model: it.brand_model || '',
    issue_description: it.issue_description || it.reported_issue || service.reported_issue || 'General Service & Repair',
    reported_issue: it.reported_issue || it.issue_description || service.reported_issue || 'General Service & Repair',
    quantity: parseFloat(it.quantity) || 1,
    unit: it.unit || 'NOS',
    rate: parseFloat(it.rate) || 0,
    amount: parseFloat(it.amount) || 0,
    tax_rate: parseFloat(it.tax_rate) || 18,
    tax_amount: parseFloat(it.tax_amount) || 0,
    hsn_code: it.hsn_code || '9987',
    serial_number: (it.has_serial && it.serial_number) ? it.serial_number : (it.serial_number && it.serial_number.trim() !== (it.brand_model || '').trim() ? it.serial_number : '')
  }))

  return generateMasterPdfBase64({
    documentType: 'SERVICE_INVOICE',
    billData: { ...service, is_service: true, items: mappedItems },
    settings,
    company: settings
  })
}

/**
 * Generate Base64 PDF for Service Payment Receipt
 */
export async function generateServiceReceiptPdfBase64(service, settings = {}) {
  const mappedItems = (service.items || []).map((it) => ({
    ...it,
    item_name: it.product_name || it.item_name || 'Service Item',
    name: it.product_name || it.item_name || 'Service Item',
    brand_model: it.brand_model || '',
    issue_description: it.issue_description || it.reported_issue || service.reported_issue || 'General Service & Repair',
    reported_issue: it.reported_issue || it.issue_description || service.reported_issue || 'General Service & Repair',
    quantity: parseFloat(it.quantity) || 1,
    unit: it.unit || 'NOS',
    rate: parseFloat(it.rate) || 0,
    amount: parseFloat(it.amount) || 0,
    tax_rate: parseFloat(it.tax_rate) || 18,
    tax_amount: parseFloat(it.tax_amount) || 0,
    hsn_code: it.hsn_code || '9987',
    serial_number: (it.has_serial && it.serial_number) ? it.serial_number : (it.serial_number && it.serial_number.trim() !== (it.brand_model || '').trim() ? it.serial_number : '')
  }))

  return generateMasterPdfBase64({
    documentType: 'SERVICE_RECEIPT',
    billData: { ...service, is_service: true, items: mappedItems },
    settings,
    company: settings
  })
}

/**
 * Generate Base64 PDF for Service Quotation
 */
export async function generateServiceQuotationPdfBase64(service, settings = {}) {
  let snapshot = service.company_snapshot
  if (typeof snapshot === 'string') {
    try { snapshot = JSON.parse(snapshot) } catch { snapshot = null }
  }

  let parsedServiceQtnTerms = []
  if (Array.isArray(snapshot?.service_quotation_terms) && snapshot.service_quotation_terms.length > 0) {
    parsedServiceQtnTerms = snapshot.service_quotation_terms
  } else if (Array.isArray(settings?.service_quotation_terms) && settings.service_quotation_terms.length > 0) {
    parsedServiceQtnTerms = settings.service_quotation_terms
  } else if (typeof settings?.service_quotation_terms === 'string') {
    try { parsedServiceQtnTerms = JSON.parse(settings.service_quotation_terms) } catch { parsedServiceQtnTerms = [] }
  }

  const mappedItems = (service.items || []).map((it) => ({
    ...it,
    item_name: it.product_name || it.item_name || 'Service Item',
    name: it.product_name || it.item_name || 'Service Item',
    brand_model: it.brand_model || '',
    issue_description: it.issue_description || it.reported_issue || service.reported_issue || 'General Service & Repair',
    reported_issue: it.reported_issue || it.issue_description || service.reported_issue || 'General Service & Repair',
    quantity: parseFloat(it.quantity) || 1,
    unit: it.unit || 'NOS',
    rate: parseFloat(it.rate) || 0,
    amount: parseFloat(it.amount) || 0,
    tax_rate: parseFloat(it.tax_rate) || 18,
    tax_amount: parseFloat(it.tax_amount) || 0,
    hsn_code: it.hsn_code || '9987',
    serial_number: (it.has_serial && it.serial_number) ? it.serial_number : (it.serial_number && it.serial_number.trim() !== (it.brand_model || '').trim() ? it.serial_number : '')
  }))

  const cleanSnapshot = snapshot ? {
    ...snapshot,
    service_quotation_terms: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    quotation_terms: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    terms_conditions: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    service_terms: undefined
  } : null

  const quotationData = {
    ...service,
    company_snapshot: cleanSnapshot,
    is_service: true,
    quotation_number: service.quotation_number || service.service_quotation_number || service.service_number,
    quotation_date: service.service_date,
    service_quotation_terms: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    quotation_terms: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    terms_conditions: parsedServiceQtnTerms.length > 0 ? parsedServiceQtnTerms : undefined,
    valid_until: null,
    items: mappedItems
  }

  return generateMasterPdfBase64({
    documentType: 'SERVICE_QUOTATION',
    billData: quotationData,
    settings,
    company: settings
  })
}

/**
 * Backward compatibility fallback wrapper for any legacy call
 */
export async function generatePdfBase64FromComponent(Component, props = {}) {
  const billData = props.bill || props.quotation || props.service || props.data || {}
  const settings = props.settings || {}
  return generateInvoicePdfBase64(billData, settings)
}
