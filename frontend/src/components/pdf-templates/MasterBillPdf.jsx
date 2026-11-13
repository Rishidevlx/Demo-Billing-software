import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Rect,
  Line
} from '@react-pdf/renderer'

// Define crisp, print-standard PDF styles matching the UI preview exactly
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#292424',
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 0,
    paddingHorizontal: 0,
    position: 'relative',
    height: '100%'
  },
  contentWrapper: {
    paddingHorizontal: 26,
    paddingBottom: 60,
    flex: 1
  },

  // Header styles (matching TemplateHeader.jsx exactly)
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10
  },
  logo: {
    width: 60,
    height: 48,
    objectFit: 'contain',
    marginRight: 10
  },
  brandingBox: {
    flex: 1
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  companyAddress: {
    fontSize: 7.8,
    color: '#4b5563',
    lineHeight: 1.25,
    marginBottom: 2
  },
  companyContacts: {
    fontSize: 7.8,
    color: '#374151',
    fontFamily: 'Helvetica-Bold'
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2
  },
  gstinBox: {
    fontSize: 9,
    color: '#1f2937'
  },
  gstinLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    fontSize: 8.5
  },
  gstinValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  headerDivider: {
    height: 2,
    backgroundColor: '#111827',
    marginBottom: 7,
    marginTop: 3
  },

  // Meta Bar styles (matching TemplateMetaBar.jsx)
  metaBar: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4.5,
    paddingHorizontal: 9,
    marginBottom: 7
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    color: '#4b5563',
    textTransform: 'uppercase',
    marginRight: 4
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827'
  },
  metaDueDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
    paddingLeft: 8,
    marginLeft: 8
  },
  metaDueDateLabel: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    color: '#be123c',
    textTransform: 'uppercase',
    marginRight: 4
  },
  metaDueDateValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#9f1239'
  },

  // Party Box (Billing & Shipping - matching TemplatePartyBox.jsx)
  partyBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 7,
    marginBottom: 7,
    flexDirection: 'row'
  },
  partyColLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingRight: 8
  },
  partyColRight: {
    flex: 1,
    paddingLeft: 8
  },
  partyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  partyTitle: {
    fontSize: 8.8,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase'
  },
  copyTag: {
    fontSize: 6.8,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 1,
    paddingHorizontal: 4
  },
  customerName: {
    fontSize: 7.8,
    fontFamily: 'Helvetica',
    color: '#111827',
    marginBottom: 2
  },
  partyText: {
    fontSize: 7.8,
    color: '#374151',
    lineHeight: 1.25
  },
  partyFieldRow: {
    flexDirection: 'row',
    marginTop: 1.5
  },
  partyFieldLabel: {
    fontSize: 7.8,
    fontFamily: 'Helvetica',
    color: '#374151'
  },
  partyFieldValue: {
    fontSize: 7.8,
    color: '#111827'
  },

  // Table styles
  tableContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 6
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 22
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db'
  },
  colSno: { width: '5%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colItems: { width: '33%', alignItems: 'flex-start', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 5, paddingVertical: 4.5 },
  colHsn: { width: '11%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colQty: { width: '9%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colDisc: { width: '8%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colRate: { width: '12%', alignItems: 'flex-end', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 4, paddingVertical: 4.5 },
  colTax: { width: '10%', alignItems: 'flex-end', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 4, paddingVertical: 4.5 },
  colAmount: { width: '12%', alignItems: 'flex-end', justifyContent: 'flex-start', paddingHorizontal: 5, paddingVertical: 4.5 },
  colSubTotal: { width: '38%', alignItems: 'flex-start', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 5, paddingVertical: 4.5 },

  // Service table column styles (7 columns matching Service Invoice Preview exactly: #, PRODUCT & MODEL, REPORTED ISSUE / SERVICE, QTY, RATE, TAX, AMOUNT)
  colSnoService: { width: '5%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colProductService: { width: '30%', alignItems: 'flex-start', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 5, paddingVertical: 4.5 },
  colIssueService: { width: '27%', alignItems: 'flex-start', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 5, paddingVertical: 4.5 },
  colQtyService: { width: '8%', alignItems: 'center', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 2, paddingVertical: 4.5 },
  colRateService: { width: '10%', alignItems: 'flex-end', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 4, paddingVertical: 4.5 },
  colTaxService: { width: '10%', alignItems: 'flex-end', justifyContent: 'flex-start', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 4, paddingVertical: 4.5 },
  colAmountService: { width: '10%', alignItems: 'flex-end', justifyContent: 'flex-start', paddingHorizontal: 5, paddingVertical: 4.5 },
  colTotalItemsService: { width: '62%', alignItems: 'flex-end', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#d1d5db', paddingHorizontal: 5, paddingVertical: 4.5 },

  thText: {
    fontSize: 7.2,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase'
  },
  tdText: {
    fontSize: 7.8,
    color: '#1f2937'
  },
  itemName: {
    fontSize: 8.2,
    fontFamily: 'Helvetica-Bold',
    color: '#111827'
  },
  itemSubtext: {
    fontSize: 6.8,
    color: '#6b7280',
    marginTop: 0.5
  },

  // Summary Grid (Bottom on Last Page)
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 3,
    marginBottom: 4
  },
  summaryColLeft: {
    paddingRight: 8
  },
  summaryColCenter: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4
  },
  summaryColRight: {
    paddingLeft: 6
  },
  sectionTitle: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 2.5
  },
  bankTextRow: {
    fontSize: 7.5,
    marginBottom: 1.2
  },
  bankLabel: {
    fontFamily: 'Helvetica',
    color: '#374151'
  },
  bankValue: {
    color: '#111827'
  },
  termsListContainer: {
    marginTop: 4
  },
  termsItemRow: {
    flexDirection: 'row',
    marginBottom: 1.5
  },
  termsBullet: {
    fontSize: 6.8,
    color: '#374151',
    width: 11
  },
  termsText: {
    fontSize: 6.8,
    color: '#374151',
    flex: 1,
    lineHeight: 1.2
  },

  // Receipt Special Box (Payment Mode & Payment/Service Status)
  paymentModeBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 5,
    marginTop: 5
  },
  paymentModeLine: {
    fontSize: 7.5,
    color: '#4b5563',
    marginBottom: 1.5
  },

  // QR Section
  qrImage: {
    width: 82,
    height: 82,
    objectFit: 'contain',
    marginTop: 2
  },
  qrTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 2
  },

  // Right Tax calculation rows
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.2
  },
  calcLabel: {
    fontSize: 7.5,
    color: '#4b5563'
  },
  calcValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#111827'
  },
  discountLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#047857'
  },
  discountValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#047857'
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#9ca3af',
    paddingVertical: 2.5,
    marginVertical: 2.5
  },
  grandTotalLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase'
  },
  grandTotalValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827'
  },
  inWordsContainer: {
    marginTop: 1.5,
    marginBottom: 4
  },
  inWordsText: {
    fontSize: 6.5,
    color: '#4b5563',
    lineHeight: 1.2
  },

  // Signature Block
  signatureBlock: {
    alignItems: 'center',
    marginTop: 6
  },
  signatureImage: {
    height: 32,
    width: 95,
    objectFit: 'contain',
    marginBottom: 4
  },
  signatureDivider: {
    width: 130,
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    marginBottom: 3
  },
  signatorySubtext: {
    fontSize: 6.8,
    color: '#6b7280'
  },
  signatoryCompany: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textTransform: 'uppercase'
  },

  // Footer Ribbon - Exact replica of brand letterhead (reference/image.png)
  footerRibbon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#003882',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10
  },
  footerLeftStacked: {
    flexDirection: 'column',
    justifyContent: 'center'
  },
  footerPillItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerIconCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  footerPillText: {
    fontSize: 7.8,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold'
  },
  footerSlantedDivider: {
    width: 18,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12
  },
  footerAddressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  footerAddressText: {
    fontSize: 7.2,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginLeft: 6
  }
})

// Native SVG Phone Icon matching brand letterhead
const PhoneIcon = () => (
  <View style={styles.footerIconCircle}>
    <Svg width={8} height={8} viewBox="0 0 24 24">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        fill="#003882"
        stroke="#003882"
        strokeWidth={1}
      />
    </Svg>
  </View>
)

// Native SVG Mail Icon matching brand letterhead
const MailIcon = () => (
  <View style={styles.footerIconCircle}>
    <Svg width={8.5} height={8.5} viewBox="0 0 24 24">
      <Rect
        x={2}
        y={4}
        width={20}
        height={16}
        rx={2}
        fill="none"
        stroke="#003882"
        strokeWidth={2.5}
      />
      <Path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        fill="none"
        stroke="#003882"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
)

// Native SVG MapPin Icon matching brand letterhead
const MapPinIcon = () => (
  <View style={styles.footerIconCircle}>
    <Svg width={9} height={9} viewBox="0 0 24 24">
      <Path
        d="M 12 2 C 8.13 2 5 5.13 5 9 c 0 5.25 7 13 7 13 s 7 -7.75 7 -13 c 0 -3.87 -3.13 -7 -7 -7 Z"
        fill="#003882"
      />
      <Circle
        cx={12}
        cy={9}
        r={2.8}
        fill="#ffffff"
      />
    </Svg>
  </View>
)

// Address line formatter to match 3-line layout in reference/image.png
function formatFooterAddressLines(addr) {
  if (!addr || typeof addr !== 'string') {
    return [
      '7A3, Thulasi Ammal Layout 2nd Street,',
      'Lakshmipuram, Peelamedu Post,',
      'Coimbatore – 641004.'
    ]
  }
  if (addr.includes('Thulasi Ammal') || addr.includes('Peelamedu')) {
    return [
      '7A3, Thulasi Ammal Layout 2nd Street,',
      'Lakshmipuram, Peelamedu Post,',
      'Coimbatore – 641004.'
    ]
  }
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) return [addr]
  if (parts.length === 2) return [`${parts[0]},`, parts[1]]
  const mid1 = Math.ceil(parts.length / 3)
  const mid2 = Math.ceil((parts.length * 2) / 3)
  return [
    parts.slice(0, mid1).join(', ') + ',',
    parts.slice(mid1, mid2).join(', ') + ',',
    parts.slice(mid2).join(', ')
  ]
}

// Helper to paginate items into strictly 5 items per A4 page
function paginateItems(items, chunkSize = 5) {
  if (!items || items.length === 0) {
    return [{
      pageIndex: 1,
      totalPages: 1,
      startIndex: 0,
      items: [],
      isFirstPage: true,
      isLastPage: true,
      showSummary: true
    }]
  }

  const totalPages = Math.max(1, Math.ceil(items.length / chunkSize))
  const pages = []

  for (let i = 0; i < totalPages; i++) {
    const start = i * chunkSize
    const chunk = items.slice(start, start + chunkSize)
    pages.push({
      pageIndex: i + 1,
      totalPages,
      startIndex: start,
      items: chunk,
      isFirstPage: i === 0,
      isLastPage: i === totalPages - 1,
      showSummary: i === totalPages - 1
    })
  }

  return pages
}

// Format Date helper (e.g. 10 Oct 2026)
function formatDate(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Format Quantity
function formatQty(qty) {
  const num = parseFloat(qty) || 0
  return num % 1 === 0 ? parseInt(num, 10) : num
}

// Format Currency
function formatCurrency(val) {
  const num = parseFloat(val) || 0
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Extract dynamic terms and conditions based on bill type and system settings
 */
export function resolveDynamicTerms(docType, billData, snapshot, settings) {
  const type = (docType || '').toUpperCase()
  let rawTerms = []

  if (type === 'INVOICE') {
    if (Array.isArray(snapshot?.invoice_terms) && snapshot.invoice_terms.length > 0) {
      rawTerms = snapshot.invoice_terms
    } else if (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0) {
      rawTerms = snapshot.terms_conditions
    } else if (Array.isArray(settings?.invoice_terms) && settings.invoice_terms.length > 0) {
      rawTerms = settings.invoice_terms
    } else if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    } else if (typeof settings?.invoice_terms === 'string') {
      try { rawTerms = JSON.parse(settings.invoice_terms) } catch {}
    } else if (typeof settings?.terms_conditions === 'string') {
      try { rawTerms = JSON.parse(settings.terms_conditions) } catch {}
    }
  } else if (type === 'SERVICE_INVOICE') {
    if (Array.isArray(snapshot?.service_terms) && snapshot.service_terms.length > 0) {
      rawTerms = snapshot.service_terms
    } else if (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0) {
      rawTerms = snapshot.terms_conditions
    } else if (Array.isArray(settings?.service_terms) && settings.service_terms.length > 0) {
      rawTerms = settings.service_terms
    } else if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    } else if (typeof settings?.service_terms === 'string') {
      try { rawTerms = JSON.parse(settings.service_terms) } catch {}
    } else if (typeof settings?.terms_conditions === 'string') {
      try { rawTerms = JSON.parse(settings.terms_conditions) } catch {}
    }
  } else if (type === 'SERVICE_QUOTATION') {
    if (Array.isArray(billData?.service_quotation_terms) && billData.service_quotation_terms.length > 0) {
      rawTerms = billData.service_quotation_terms
    } else if (Array.isArray(snapshot?.service_quotation_terms) && snapshot.service_quotation_terms.length > 0) {
      rawTerms = snapshot.service_quotation_terms
    } else if (Array.isArray(settings?.service_quotation_terms) && settings.service_quotation_terms.length > 0) {
      rawTerms = settings.service_quotation_terms
    } else if (typeof settings?.service_quotation_terms === 'string') {
      try { rawTerms = JSON.parse(settings.service_quotation_terms) } catch {}
    }
  } else if (type === 'QUOTATION') {
    if (Array.isArray(billData?.quotation_terms) && billData.quotation_terms.length > 0) {
      rawTerms = billData.quotation_terms
    } else if (Array.isArray(snapshot?.quotation_terms) && snapshot.quotation_terms.length > 0) {
      rawTerms = snapshot.quotation_terms
    } else if (Array.isArray(settings?.quotation_terms) && settings.quotation_terms.length > 0) {
      rawTerms = settings.quotation_terms
    } else if (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0) {
      rawTerms = snapshot.terms_conditions
    } else if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    } else if (typeof settings?.quotation_terms === 'string') {
      try { rawTerms = JSON.parse(settings.quotation_terms) } catch {}
    } else if (typeof settings?.terms_conditions === 'string') {
      try { rawTerms = JSON.parse(settings.terms_conditions) } catch {}
    }
  } else if (type === 'RECEIPT') {
    if (Array.isArray(snapshot?.receipt_terms) && snapshot.receipt_terms.length > 0) {
      rawTerms = snapshot.receipt_terms
    } else if (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0) {
      rawTerms = snapshot.terms_conditions
    } else if (Array.isArray(settings?.receipt_terms) && settings.receipt_terms.length > 0) {
      rawTerms = settings.receipt_terms
    } else if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    }
  } else if (type === 'SERVICE_RECEIPT') {
    if (Array.isArray(snapshot?.service_receipt_terms) && snapshot.service_receipt_terms.length > 0) {
      rawTerms = snapshot.service_receipt_terms
    } else if (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0) {
      rawTerms = snapshot.terms_conditions
    } else if (Array.isArray(settings?.service_receipt_terms) && settings.service_receipt_terms.length > 0) {
      rawTerms = settings.service_receipt_terms
    } else if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    }
  }

  // Fallback to general terms if nothing found
  if (!Array.isArray(rawTerms) || rawTerms.length === 0) {
    if (Array.isArray(settings?.terms_conditions) && settings.terms_conditions.length > 0) {
      rawTerms = settings.terms_conditions
    } else if (typeof settings?.terms_conditions === 'string') {
      try { rawTerms = JSON.parse(settings.terms_conditions) } catch {}
    }
  }

  const termsList = Array.isArray(rawTerms) ? rawTerms : []

  // Check Return policy logic for sales/service invoice
  const items = Array.isArray(billData?.items) ? billData.items : []
  const hasReturnableItems = items.some(it => it.return_policy === true || it.return_policy === 1 || it.return_policy === '1')
  const rawReturnDays = snapshot?.return_days !== undefined && snapshot?.return_days !== null && snapshot?.return_days !== ''
    ? snapshot.return_days
    : (settings?.return_days !== undefined && settings?.return_days !== null && settings?.return_days !== '' ? settings.return_days : 0)
  const returnDays = parseInt(rawReturnDays, 10) || 0

  if (hasReturnableItems && returnDays > 0) {
    const customClause = ((snapshot?.return_policy_clause || settings?.return_policy_clause) || '').trim()
    const returnClause = customClause
      ? customClause.replace('{days}', `${returnDays} days`)
      : `Products eligible for return have to be returned within ${returnDays} days of purchase with original invoice copy.`
    return [returnClause, ...termsList.filter(t => !t.toLowerCase().includes('will not be taken back'))]
  }

  return termsList
}

/**
 * Master PDF Document Component - One unified template for all bill types!
 */
export default function MasterBillPdf({
  documentType = 'INVOICE', // 'INVOICE' | 'QUOTATION' | 'SERVICE_INVOICE' | 'SERVICE_QUOTATION' | 'RECEIPT' | 'SERVICE_RECEIPT'
  billData = {},
  settings = {},
  company = {}
}) {
  const data = billData || {}

  // Parse snapshot if present
  let snapshot = data?.company_snapshot || null
  if (typeof snapshot === 'string') {
    try { snapshot = JSON.parse(snapshot) } catch { snapshot = null }
  }

  const effectiveSettings = snapshot || settings || {}
  const effectiveCompany = snapshot || company || settings || {}
  const effectiveBank = snapshot || settings?.bank_details || settings || {}

  const companyName = effectiveCompany?.company_name || effectiveCompany?.name || 'SIMCHA INFO SOLUTIONS'
  const companyGstin = effectiveCompany?.gstin || ''
  const companyPhone = effectiveCompany?.phone || '8122022060'
  const cleanPhone = (companyPhone || '8122022060').toString().trim()
  let displayPhone = cleanPhone
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '')
  if (digitsOnly.length === 10) {
    displayPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2)
    displayPhone = `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  const companyEmail = effectiveCompany?.email || 'simchainfosolutions@gmail.com'
  const companyAddress = effectiveCompany?.address || '7A3, Thulasi Ammal Layout 2nd Street, Lakshmipuram, Peelamedu Post, Coimbatore - 641 004.'
  const logoUrl = effectiveCompany?.logo_url || settings?.logo_url || settings?.logo || ''

  const bankName = effectiveBank?.bank_name || effectiveBank?.bankName || ''
  const bankBranch = effectiveBank?.branch || ''
  const bankAccountName = effectiveBank?.account_name || effectiveBank?.accountName || companyName
  const bankAccountNo = effectiveBank?.account_no || effectiveBank?.accountNo || ''
  const bankIfsc = effectiveBank?.ifsc_code || effectiveBank?.ifscCode || ''
  const bankImageUrl = effectiveBank?.bank_image_url || effectiveBank?.bankImageUrl || data.bank_image_url || ''
  const signatureUrl = effectiveSettings?.signature_url || effectiveSettings?.signatureUrl || data.signature_url || ''

  // Document Type specific labels
  const type = documentType.toUpperCase()
  const isReceipt = type === 'RECEIPT' || type === 'SERVICE_RECEIPT'
  const isInvoice = type === 'INVOICE' || type === 'SERVICE_INVOICE'
  const isQuotation = type === 'QUOTATION' || type === 'SERVICE_QUOTATION'
  const isServiceDoc = type.startsWith('SERVICE_') || Boolean(data.is_service || data.service_number)

  let docNumberLabel = 'SALES INVOICE NUMBER:'
  let docNumber = data.invoice_number || data.bill_number || ''
  let dateLabel = 'SALES DATE:'
  let dateValue = formatDate(data.invoice_date || data.date)
  let dueDateLabel = data.due_date ? 'DUE DATE:' : null
  let dueDateValue = data.due_date ? formatDate(data.due_date) : null
  let billTitle = 'Billing Details'
  let shipTitle = 'SHIP TO / DELIVERY ADDRESS'
  let showQrCode = false
  let showBankDetails = true
  let totalLabel = 'Invoice Total'

  if (type === 'QUOTATION') {
    docNumberLabel = 'QUOTATION NUMBER:'
    docNumber = data.quotation_number || ''
    dateLabel = 'QUOTATION DATE:'
    dateValue = formatDate(data.quotation_date || data.date)
    dueDateLabel = data.valid_until ? 'VALID UNTIL:' : null
    dueDateValue = data.valid_until ? formatDate(data.valid_until) : null
    billTitle = 'Billing Details'
    shipTitle = 'SHIP TO / DELIVERY ADDRESS'
    showQrCode = false
    showBankDetails = true
    totalLabel = 'Quotation Total'
  } else if (type === 'SERVICE_QUOTATION') {
    docNumberLabel = 'QUOTATION NUMBER:'
    docNumber = data.quotation_number || data.service_quotation_number || data.service_number || ''
    dateLabel = 'QUOTATION DATE:'
    dateValue = formatDate(data.quotation_date || data.service_date || data.date)
    dueDateLabel = data.valid_until ? 'VALID UNTIL:' : null
    dueDateValue = data.valid_until ? formatDate(data.valid_until) : null
    billTitle = 'CUSTOMER DETAILS'
    shipTitle = 'DELIVERY / SITE ADDRESS'
    showQrCode = false
    showBankDetails = true
    totalLabel = 'Quotation Total'
  } else if (type === 'SERVICE_INVOICE') {
    docNumberLabel = 'SERVICE INVOICE NUMBER:'
    docNumber = data.service_number || data.invoice_number || ''
    dateLabel = 'SERVICE DATE:'
    dateValue = formatDate(data.service_date || data.invoice_date || data.date)
    dueDateLabel = data.due_date ? 'DUE DATE:' : null
    dueDateValue = data.due_date ? formatDate(data.due_date) : null
    billTitle = 'CUSTOMER DETAILS'
    shipTitle = 'DELIVERY / SITE ADDRESS'
    showQrCode = !!bankImageUrl
    showBankDetails = true
    totalLabel = 'Service Total'
  } else if (type === 'SERVICE_RECEIPT') {
    docNumberLabel = 'RECEIPT NUMBER:'
    docNumber = data.receipt_number || data.service_number || data.invoice_number || ''
    dateLabel = 'RECEIPT DATE:'
    dateValue = formatDate(data.receipt_date || data.payment_date || data.service_date || data.date)
    dueDateLabel = null
    dueDateValue = null
    billTitle = 'CUSTOMER DETAILS'
    shipTitle = 'DELIVERY / SITE ADDRESS'
    showQrCode = false
    showBankDetails = false
    totalLabel = 'Total Amount Received'
  } else if (isReceipt) {
    docNumberLabel = 'RECEIPT NUMBER:'
    docNumber = data.receipt_number || data.invoice_number || data.service_number || ''
    dateLabel = 'RECEIPT DATE:'
    dateValue = formatDate(data.receipt_date || data.payment_date || data.invoice_date || data.service_date || data.date)
    dueDateLabel = null
    dueDateValue = null
    billTitle = 'Payment Received From'
    shipTitle = 'DELIVERY / SHIPPING ADDRESS'
    showQrCode = false
    showBankDetails = false
    totalLabel = 'Total Amount Received'
  } else {
    // Sales Invoice
    docNumberLabel = 'SALES INVOICE NUMBER:'
    docNumber = data.invoice_number || ''
    dateLabel = 'SALES DATE:'
    dateValue = formatDate(data.invoice_date || data.date)
    billTitle = 'Billing Details'
    shipTitle = 'SHIP TO / DELIVERY ADDRESS'
    showQrCode = !!bankImageUrl
    showBankDetails = true
    totalLabel = 'Invoice Total'
  }

  // Resolve dynamic terms according to bill type & system settings
  const termsList = resolveDynamicTerms(type, data, snapshot, effectiveSettings)

  // Items and totals
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.parts) ? data.parts : [])
  const totalTaxAmt = items.reduce((sum, it) => sum + (parseFloat(it.tax_amount) || 0), 0)
  const effectiveTotalTax = parseFloat(data.total_tax || 0) || totalTaxAmt || 0
  const isGst = data.invoice_type === 'GST' || data.service_type === 'GST' || data.quotation_type === 'GST' || (!data.invoice_type && effectiveTotalTax > 0) || effectiveTotalTax > 0
  const isIntraState = !data.place_of_supply || data.place_of_supply.includes('33') || data.place_of_supply.toLowerCase().includes('tamil nadu')

  const cgstRateVal = parseFloat(data.cgst_rate || effectiveSettings?.cgst_rate || 9).toFixed(2)
  const sgstRateVal = parseFloat(data.sgst_rate || effectiveSettings?.sgst_rate || 9).toFixed(2)
  const igstRateVal = parseFloat(data.igst_rate || effectiveSettings?.igst_rate || 18).toFixed(2)

  const cgstAmountVal = parseFloat(data.cgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const sgstAmountVal = parseFloat(data.sgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const igstAmountVal = parseFloat(data.igst_amount) || (!isIntraState ? effectiveTotalTax : 0)

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)
  const totalGrossAmt = items.reduce((sum, it) => sum + (parseFloat(it.amount) || (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0))), 0)
  const totalDiscountSavings = items.reduce((sum, it) => sum + ((parseFloat(it.discount_amount) || 0) * (parseFloat(it.quantity) || 1)), 0)
  const totalGrossOrigAmt = items.reduce((sum, it) => sum + (((parseFloat(it.original_rate) || parseFloat(it.rate) || 0)) * (parseFloat(it.quantity) || 1)), 0)

  const paginatedPages = paginateItems(items, 5)

  // Layout sizing: Invoices use 3 columns (Left 5/12, Center 3/12, Right 4/12).
  // Receipts and Quotations use 2 columns (Left 6/12, Right 6/12).
  const isThreeColumn = isInvoice && showQrCode
  const leftColFlex = isThreeColumn ? 5 : 6
  const rightColFlex = isThreeColumn ? 4 : 6

  return (
    <Document title={`${docNumberLabel} ${docNumber}`}>
      {paginatedPages.map((page) => (
        <Page key={page.pageIndex} size="A4" style={styles.page}>
          <View style={styles.contentWrapper}>
            {/* 1. Header with Logo & Company branding (Matching TemplateHeader preview) */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                {logoUrl ? (
                  <Image src={logoUrl} style={styles.logo} />
                ) : null}
                <View style={styles.brandingBox}>
                  <Text style={styles.companyName}>{companyName}</Text>
                  {companyAddress ? (
                    <Text style={styles.companyAddress}>{companyAddress}</Text>
                  ) : null}
                  <Text style={styles.companyContacts}>
                    {companyPhone ? `Mobile: ${companyPhone}` : ''}
                    {companyPhone && companyEmail ? '  |  ' : ''}
                    {companyEmail ? `Email: ${companyEmail}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                {companyGstin ? (
                  <Text style={styles.gstinBox}>
                    <Text style={styles.gstinLabel}>GSTIN: </Text>
                    <Text style={styles.gstinValue}>{companyGstin}</Text>
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Blue Divider Rule */}
            <View style={styles.headerDivider} />

            {/* 2. Meta Bar */}
            <View style={styles.metaBar}>
              <View style={styles.metaLeft}>
                <Text style={styles.metaLabel}>{docNumberLabel}</Text>
                <Text style={styles.metaValue}>{docNumber}</Text>
              </View>
              <View style={styles.metaRight}>
                <Text style={styles.metaLabel}>{dateLabel}</Text>
                <Text style={styles.metaValue}>{dateValue}</Text>
                {dueDateLabel && dueDateValue ? (
                  <View style={styles.metaDueDateGroup}>
                    <Text style={styles.metaDueDateLabel}>{dueDateLabel}</Text>
                    <Text style={styles.metaDueDateValue}>{dueDateValue}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* 3. Customer Party Box (Bill To & Ship To) - FIRST PAGE ONLY */}
            {page.isFirstPage ? (
              <View style={styles.partyBox}>
                <View style={styles.partyColLeft}>
                  <View style={styles.partyTitleRow}>
                    <Text style={styles.partyTitle}>{billTitle}</Text>
                    <Text style={styles.copyTag}>{data.copy_type || 'ORIGINAL'}</Text>
                  </View>
                  <Text style={styles.customerName}>{data.customer_name || 'Valued Customer'}</Text>
                  {data.customer_address ? (
                    <Text style={styles.partyText}>{data.customer_address}</Text>
                  ) : null}
                  {data.customer_phone ? (
                    <View style={styles.partyFieldRow}>
                      <Text style={styles.partyFieldLabel}>Mobile: </Text>
                      <Text style={styles.partyFieldValue}>{data.customer_phone}</Text>
                    </View>
                  ) : null}
                  {data.customer_email ? (
                    <View style={styles.partyFieldRow}>
                      <Text style={styles.partyFieldLabel}>Email: </Text>
                      <Text style={styles.partyFieldValue}>{data.customer_email}</Text>
                    </View>
                  ) : null}
                  <View style={styles.partyFieldRow}>
                    <Text style={styles.partyFieldLabel}>Place of Supply: </Text>
                    <Text style={styles.partyFieldValue}>{data.place_of_supply || '33-Tamil Nadu'}</Text>
                  </View>
                  {data.customer_gstin ? (
                    <View style={styles.partyFieldRow}>
                      <Text style={styles.partyFieldLabel}>GSTIN: </Text>
                      <Text style={styles.partyFieldValue}>{data.customer_gstin}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.partyColRight}>
                  <Text style={styles.partyTitle}>{shipTitle}</Text>
                  <Text style={styles.customerName}>{data.customer_name || 'Valued Customer'}</Text>
                  <Text style={styles.partyText}>
                    {data.delivery_address && data.delivery_address.trim() ? data.delivery_address : (data.customer_address || 'Same as billing address')}
                  </Text>
                  {data.customer_phone ? (
                    <View style={styles.partyFieldRow}>
                      <Text style={styles.partyFieldLabel}>Contact: </Text>
                      <Text style={styles.partyFieldValue}>{data.customer_phone}</Text>
                    </View>
                  ) : null}
                  <View style={styles.partyFieldRow}>
                    <Text style={styles.partyFieldLabel}>Destination: </Text>
                    <Text style={styles.partyFieldValue}>{data.place_of_supply || '33-Tamil Nadu'}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* 4. Line Items Table */}
            <View style={styles.tableContainer}>
              {isServiceDoc ? (
                /* Service 7-Column Header (Matching Service Invoice Preview exactly: #, PRODUCT & MODEL, REPORTED ISSUE / SERVICE, QTY, RATE, TAX, AMOUNT) */
                <View style={styles.tableHeaderRow}>
                  <View style={styles.colSnoService}><Text style={styles.thText}>#</Text></View>
                  <View style={styles.colProductService}><Text style={styles.thText}>PRODUCT & MODEL</Text></View>
                  <View style={styles.colIssueService}><Text style={styles.thText}>REPORTED ISSUE / SERVICE</Text></View>
                  <View style={styles.colQtyService}><Text style={styles.thText}>QTY</Text></View>
                  <View style={styles.colRateService}><Text style={styles.thText}>RATE</Text></View>
                  <View style={styles.colTaxService}><Text style={styles.thText}>TAX</Text></View>
                  <View style={[styles.colAmountService, { borderRightWidth: 0 }]}><Text style={styles.thText}>AMOUNT</Text></View>
                </View>
              ) : (
                /* Standard Non-Service 8-Column Header */
                <View style={styles.tableHeaderRow}>
                  <View style={styles.colSno}><Text style={styles.thText}>S.NO</Text></View>
                  <View style={styles.colItems}><Text style={styles.thText}>ITEMS</Text></View>
                  <View style={styles.colHsn}><Text style={styles.thText}>HSN/SAC</Text></View>
                  <View style={styles.colQty}><Text style={styles.thText}>QTY</Text></View>
                  <View style={styles.colDisc}><Text style={styles.thText}>DISC (%)</Text></View>
                  <View style={styles.colRate}><Text style={styles.thText}>RATE</Text></View>
                  <View style={styles.colTax}><Text style={styles.thText}>TAX</Text></View>
                  <View style={[styles.colAmount, { borderRightWidth: 0 }]}><Text style={styles.thText}>AMOUNT</Text></View>
                </View>
              )}

              {page.items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  {isServiceDoc ? (
                    /* Service 7-Column Row */
                    <>
                      <View style={styles.colSnoService}>
                        <Text style={styles.tdText}>{page.startIndex + idx + 1}</Text>
                      </View>
                      <View style={styles.colProductService}>
                        <Text style={styles.itemName}>
                          {item.product_name || item.item_name || item.name || 'Item'}
                          {item.brand_model ? ` (${item.brand_model})` : ''}
                        </Text>
                        {item.serial_number && item.serial_number.trim() && item.serial_number.trim() !== (item.brand_model || '').trim() ? (
                          <Text style={styles.itemSubtext}>S/N: {item.serial_number}</Text>
                        ) : null}
                        {item.remarks ? (
                          <Text style={[styles.itemSubtext, { fontStyle: 'italic', color: '#4b5563' }]}>
                            Note: {item.remarks}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.colIssueService}>
                        <Text style={styles.tdText}>
                          {item.issue_description || item.reported_issue || 'General Service & Repair'}
                        </Text>
                      </View>
                      <View style={styles.colQtyService}>
                        <Text style={styles.tdText}>{formatQty(item.quantity)}</Text>
                      </View>
                      <View style={styles.colRateService}>
                        <Text style={styles.tdText}>
                          {parseFloat(item.rate || item.original_rate || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.colTaxService}>
                        <Text style={styles.tdText}>
                          {parseFloat(item.tax_amount || 0) > 0
                            ? parseFloat(item.tax_amount || 0).toFixed(2)
                            : '—'}
                        </Text>
                      </View>
                      <View style={[styles.colAmountService, { borderRightWidth: 0 }]}>
                        <Text style={[styles.tdText, { fontFamily: 'Helvetica-Bold' }]}>
                          {parseFloat(item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    /* Standard Non-Service 8-Column Row */
                    <>
                      <View style={styles.colSno}>
                        <Text style={styles.tdText}>{page.startIndex + idx + 1}</Text>
                      </View>
                      <View style={styles.colItems}>
                        <Text style={styles.itemName}>
                          {item.item_name || item.name || 'Item'}
                          {item.unit ? ` (${item.unit})` : ''}
                        </Text>
                        {item.brand && item.brand.trim() && item.brand.trim() !== '—' ? (
                          <Text style={styles.itemSubtext}>Brand: {item.brand}</Text>
                        ) : null}
                        {item.serial_number && item.serial_number.trim() ? (
                          <Text style={styles.itemSubtext}>S/N: {item.serial_number}</Text>
                        ) : null}
                        {item.remarks ? (
                          <Text style={[styles.itemSubtext, { fontStyle: 'italic', color: '#4b5563' }]}>
                            Note: {item.remarks}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.colHsn}>
                        <Text style={styles.tdText}>{item.hsn_code || '-'}</Text>
                      </View>
                      <View style={styles.colQty}>
                        <Text style={styles.tdText}>{formatQty(item.quantity)} Unit</Text>
                      </View>
                      <View style={styles.colDisc}>
                        <Text style={[styles.tdText, (item.has_discount || parseFloat(item.discount_percent || 0) > 0) ? { color: '#047857', fontFamily: 'Helvetica-Bold' } : {}]}>
                          {(item.has_discount || parseFloat(item.discount_percent || 0) > 0)
                            ? `${parseFloat(item.discount_percent || 0)}%`
                            : '—'}
                        </Text>
                      </View>
                      <View style={styles.colRate}>
                        <Text style={styles.tdText}>
                          {parseFloat(item.rate || item.original_rate || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.colTax}>
                        <Text style={styles.tdText}>
                          {isGst && parseFloat(item.tax_amount || 0) > 0
                            ? parseFloat(item.tax_amount || 0).toFixed(2)
                            : '0.00'}
                        </Text>
                      </View>
                      <View style={[styles.colAmount, { borderRightWidth: 0 }]}>
                        <Text style={[styles.tdText, { fontFamily: 'Helvetica-Bold' }]}>
                          {parseFloat(item.amount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              ))}

              {/* Table Subtotal on Last Page */}
              {page.showSummary && (
                <View style={styles.tableFooterRow}>
                  {isServiceDoc ? (
                    /* Service Footer Row (62% colTotalItemsService + QTY + RATE + TAX + AMOUNT) */
                    <>
                      <View style={styles.colTotalItemsService}>
                        <Text style={[styles.thText, { textAlign: 'right' }]}>
                          TOTAL ITEMS: {data.items?.length || page.items?.length || 1}
                        </Text>
                      </View>
                      <View style={styles.colQtyService}>
                        <Text style={styles.thText}>{formatQty(totalQty)}</Text>
                      </View>
                      <View style={styles.colRateService}><Text style={styles.thText} /></View>
                      <View style={styles.colTaxService}>
                        <Text style={styles.thText}>{totalTaxAmt.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.colAmountService, { borderRightWidth: 0 }]}>
                        <Text style={styles.thText}>{totalGrossAmt.toFixed(2)}</Text>
                      </View>
                    </>
                  ) : (
                    /* Standard Non-Service Footer Row */
                    <>
                      <View style={styles.colSubTotal}>
                        <Text style={styles.thText}>SUB TOTAL</Text>
                      </View>
                      <View style={styles.colHsn}><Text style={styles.thText} /></View>
                      <View style={styles.colQty}>
                        <Text style={styles.thText}>{formatQty(totalQty)} Unit</Text>
                      </View>
                      <View style={styles.colDisc}><Text style={styles.thText} /></View>
                      <View style={styles.colRate}><Text style={styles.thText} /></View>
                      <View style={styles.colTax}>
                        <Text style={styles.thText}>{totalTaxAmt.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.colAmount, { borderRightWidth: 0 }]}><Text style={styles.thText}>{totalGrossAmt.toFixed(2)}</Text></View>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* 5. Summary Grid (Last Page Only) */}
            {page.showSummary && (
              <View style={styles.summaryGrid}>
                {/* Left Column: Bank Details, Terms, and Receipt Payment Info */}
                <View style={[styles.summaryColLeft, { flex: leftColFlex }]}>
                  {showBankDetails && (
                    <View style={{ marginBottom: 5 }}>
                      <Text style={styles.sectionTitle}>BANK DETAILS</Text>
                      <Text style={styles.bankTextRow}>
                        <Text style={styles.bankLabel}>Beneficiary: </Text>
                        <Text style={styles.bankValue}>{bankAccountName}</Text>
                      </Text>
                      <Text style={styles.bankTextRow}>
                        <Text style={styles.bankLabel}>Bank: </Text>
                        <Text style={styles.bankValue}>{bankName}</Text>
                      </Text>
                      <Text style={styles.bankTextRow}>
                        <Text style={styles.bankLabel}>Account No: </Text>
                        <Text style={styles.bankValue}>{bankAccountNo}</Text>
                      </Text>
                      <Text style={styles.bankTextRow}>
                        <Text style={styles.bankLabel}>IFSC Code: </Text>
                        <Text style={styles.bankValue}>{bankIfsc}</Text>
                      </Text>
                      <Text style={styles.bankTextRow}>
                        <Text style={styles.bankLabel}>Branch: </Text>
                        <Text style={styles.bankValue}>{bankBranch}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Dynamic Terms & Conditions */}
                  {termsList && termsList.length > 0 && (
                    <View style={styles.termsListContainer}>
                      <Text style={styles.sectionTitle}>TERMS &amp; CONDITIONS</Text>
                      {termsList.map((term, tIdx) => (
                        <View key={tIdx} style={styles.termsItemRow}>
                          <Text style={styles.termsBullet}>{tIdx + 1}.</Text>
                          <Text style={styles.termsText}>{term}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Receipt Special Box (Matching preview: Payment Mode & Status) */}
                  {isReceipt && (
                    <View style={styles.paymentModeBox}>
                      <Text style={styles.paymentModeLine}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Payment Mode: </Text>
                        {data.payment_mode || 'Cash'}
                      </Text>
                      <Text style={[styles.paymentModeLine, { marginBottom: 0 }]}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                          {type === 'SERVICE_RECEIPT' ? 'Service Status: ' : 'Payment Status: '}
                        </Text>
                        <Text style={{ fontFamily: 'Helvetica-Bold', color: '#047857' }}>
                          {type === 'SERVICE_RECEIPT' ? (data.service_status || 'DELIVERED').toUpperCase() : 'PAID'}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>

                {/* Center Column: Scan to Pay QR Code (Invoice Only) */}
                {isThreeColumn ? (
                  <View style={[styles.summaryColCenter, { flex: 3 }]}>
                    <Text style={styles.qrTitle}>SCAN TO PAY</Text>
                    {bankImageUrl ? (
                      <Image src={bankImageUrl} style={styles.qrImage} />
                    ) : null}
                  </View>
                ) : null}

                {/* Right Column: Tax Breakdown, Totals & Signatory */}
                <View style={[styles.summaryColRight, { flex: rightColFlex }]}>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Gross Amount</Text>
                    <Text style={styles.calcValue}>{formatCurrency(totalGrossOrigAmt || data.taxable_amount)}</Text>
                  </View>
                  {totalDiscountSavings > 0 && (
                    <View style={styles.calcRow}>
                      <Text style={styles.discountLabel}>Discount Savings</Text>
                      <Text style={styles.discountValue}>- {formatCurrency(totalDiscountSavings)}</Text>
                    </View>
                  )}

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Taxable Amount</Text>
                    <Text style={styles.calcValue}>{formatCurrency(data.taxable_amount || (parseFloat(data.total_amount || 0) - effectiveTotalTax))}</Text>
                  </View>

                  {isGst && effectiveTotalTax > 0 && (
                    isIntraState ? (
                      <>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>CGST ({cgstRateVal}%)</Text>
                          <Text style={styles.calcValue}>{formatCurrency(cgstAmountVal)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                          <Text style={styles.calcLabel}>SGST ({sgstRateVal}%)</Text>
                          <Text style={styles.calcValue}>{formatCurrency(sgstAmountVal)}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>IGST ({igstRateVal}%)</Text>
                        <Text style={styles.calcValue}>{formatCurrency(igstAmountVal)}</Text>
                      </View>
                    )
                  )}

                  {data.round_off && parseFloat(data.round_off) !== 0 && (
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Round Off</Text>
                      <Text style={styles.calcValue}>
                        {parseFloat(data.round_off) > 0 ? `+Rs. ${data.round_off}` : `-Rs. ${Math.abs(data.round_off)}`}
                      </Text>
                    </View>
                  )}

                  {/* Grand Total */}
                  <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>{totalLabel}</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(data.total_amount)}</Text>
                  </View>

                  {/* In Words */}
                  {data.amount_in_words ? (
                    <View style={styles.inWordsContainer}>
                      <Text style={styles.inWordsText}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>In Words: </Text>
                        {data.amount_in_words}
                      </Text>
                    </View>
                  ) : null}

                  {/* Signatory */}
                  <View style={styles.signatureBlock}>
                    {signatureUrl ? (
                      <Image src={signatureUrl} style={styles.signatureImage} />
                    ) : (
                      <View style={{ height: 26 }} />
                    )}
                    <View style={styles.signatureDivider} />
                    <Text style={styles.signatorySubtext}>Authorized signatory for</Text>
                    <Text style={styles.signatoryCompany}>{companyName}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 6. Brand-Exact Letterhead Footer Ribbon */}
          <View style={styles.footerRibbon}>
            {/* Left: Stacked Phone & Email */}
            <View style={styles.footerLeftStacked}>
              <View style={styles.footerPillItem}>
                <PhoneIcon />
                <Text style={styles.footerPillText}>{displayPhone}</Text>
              </View>
              <View style={[styles.footerPillItem, { marginTop: 3 }]}>
                <MailIcon />
                <Text style={styles.footerPillText}>{companyEmail}</Text>
              </View>
            </View>

            {/* Center: Slanted Diagonal White Divider Line */}
            <View style={styles.footerSlantedDivider}>
              <Svg width={18} height={48} viewBox="0 0 18 48">
                <Line x1={2} y1={48} x2={16} y2={0} stroke="#ffffff" strokeWidth={2.2} />
              </Svg>
            </View>

            {/* Right: MapPin Icon with Single-Line Formatted Address */}
            <View style={styles.footerAddressWrapper}>
              <MapPinIcon />
              <Text style={styles.footerAddressText}>{companyAddress}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}
