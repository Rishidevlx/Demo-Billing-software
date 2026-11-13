import React from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useSettings } from '../../context/SettingsContext'
import {
  TemplatePageShell,
  TemplateHeader,
  TemplateMetaBar,
  TemplatePartyBox,
  TemplateSummaryGrid,
  TemplateFooterRibbon
} from './shared'

// Helper function to paginate service invoice items into strictly 5 items per A4 page
function paginateInvoiceItems(items) {
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

  const CHUNK_SIZE = 5
  const totalPages = Math.max(1, Math.ceil(items.length / CHUNK_SIZE))
  const pages = []

  for (let i = 0; i < totalPages; i++) {
    const start = i * CHUNK_SIZE
    const chunk = items.slice(start, start + CHUNK_SIZE)
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

export default function ServiceInvoiceTemplate({ service, bill, settings, company }) {
  const data = service || bill
  if (!data) return null

  // 1. Snapshot Pattern for Past Service Invoices Immutability (Legal Audit Rule)
  let snapshot = data?.company_snapshot || null
  if (typeof snapshot === 'string') {
    try { snapshot = JSON.parse(snapshot) } catch { snapshot = null }
  }

  // 2. Live DB Context fallback for New Services & UI Rendering
  const {
    settings: liveSettings,
    companyDetails: liveCompany,
    bankDetails: liveBank,
    signatureUrl: liveSignUrl,
    bankImageUrl: liveBankImg,
    termsList: liveTerms
  } = useSettings()

  const effectiveSettings = snapshot || settings || company || liveSettings || {}
  const effectiveCompany = snapshot || company || liveCompany || {}
  const effectiveBank = snapshot || liveBank || {}

  const companyName = effectiveCompany?.company_name || effectiveCompany?.name || ''
  const companyGstin = effectiveCompany?.gstin || ''
  const companyPhone = effectiveCompany?.phone || ''
  const companyEmail = effectiveCompany?.email || ''
  const companyAddress = effectiveCompany?.address || ''

  const bankName = snapshot?.bank_name || liveBank?.bankName || liveSettings?.bank_name || 'Canara Bank'
  const bankBranch = snapshot?.branch || liveBank?.branch || liveSettings?.branch || 'Peelamedu'
  const bankAccountName = snapshot?.account_name || liveBank?.accountName || liveSettings?.account_name || companyName || 'Simcha Info Solutions'
  const bankAccountNo = snapshot?.account_no || liveBank?.accountNo || liveSettings?.account_no || '120041754011'
  const bankIfsc = snapshot?.ifsc_code || liveBank?.ifscCode || liveSettings?.ifsc_code || 'CNRB0002732'
  const bankImageUrl = snapshot?.bank_image_url || data.bank_image_url || liveBankImg || liveSettings?.bank_image_url || ''
  const signatureUrl = effectiveSettings?.signature_url || effectiveSettings?.signatureUrl || data.signature_url || liveSignUrl || ''

  const defaultTermsList = (Array.isArray(snapshot?.service_terms) && snapshot.service_terms.length > 0)
    ? snapshot.service_terms
    : (Array.isArray(snapshot?.terms_conditions) && snapshot.terms_conditions.length > 0)
      ? snapshot.terms_conditions
      : (Array.isArray(effectiveSettings?.service_terms) && effectiveSettings.service_terms.length > 0)
        ? effectiveSettings.service_terms
        : (Array.isArray(effectiveSettings?.terms_conditions) && effectiveSettings.terms_conditions.length > 0)
          ? effectiveSettings.terms_conditions
          : (liveTerms && liveTerms.length > 0)
            ? liveTerms
            : []

  const items = Array.isArray(data.items) ? data.items : []
  const hasReturnableItems = items.some(it => it.return_policy === true || it.return_policy === 1 || it.return_policy === '1')
  const rawReturnDays = snapshot?.return_days !== undefined && snapshot?.return_days !== null && snapshot?.return_days !== ''
    ? snapshot.return_days
    : (effectiveSettings?.return_days !== undefined && effectiveSettings?.return_days !== null && effectiveSettings?.return_days !== ''
      ? effectiveSettings.return_days
      : (settings?.return_days !== undefined && settings?.return_days !== null && settings?.return_days !== '' ? settings.return_days : 0))
  const returnDays = parseInt(rawReturnDays, 10) || 0

  const hasReturnWindow = returnDays > 0
  const customReturnClause = ((snapshot?.return_policy_clause !== undefined && snapshot?.return_policy_clause !== null ? snapshot.return_policy_clause : effectiveSettings?.return_policy_clause) || settings?.return_policy_clause || '').trim()
  const returnClause = customReturnClause
    ? customReturnClause.replace('{days}', `${returnDays} days`)
    : `Products eligible for return have to be returned within ${returnDays} days of purchase with original invoice copy.`

  const termsList = (hasReturnableItems && hasReturnWindow)
    ? [returnClause, ...defaultTermsList.filter(t => !t.toLowerCase().includes('will not be taken back'))]
    : defaultTermsList
  const isGstInvoice = data.service_type === 'GST' || data.invoice_type === 'GST' || parseFloat(data.total_tax || 0) > 0
  const isIntraState = !data.place_of_supply || data.place_of_supply.includes('33') || data.place_of_supply.toLowerCase().includes('tamil nadu')

  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0)
  const totalTaxAmt = isGstInvoice ? items.reduce((sum, it) => sum + (parseFloat(it.tax_amount) || 0), 0) : 0
  const effectiveTotalTax = parseFloat(data.total_tax || 0) || totalTaxAmt || 0
  const cgstAmountVal = parseFloat(data.cgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const sgstAmountVal = parseFloat(data.sgst_amount) || (isIntraState ? effectiveTotalTax / 2 : 0)
  const igstAmountVal = parseFloat(data.igst_amount) || (!isIntraState ? effectiveTotalTax : 0)
  const taxableAmountVal = data.taxable_amount || (parseFloat(data.total_amount || 0) - effectiveTotalTax)
  const totalGrossAmt = items.reduce((sum, it) => sum + (parseFloat(it.amount) || (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0))), 0)

  // Format date helper (e.g. 18 Sept 2026)
  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Format clean integer/decimal quantity (e.g. 1, 11, 2.5)
  const formatQty = (qty) => {
    const num = parseFloat(qty) || 0
    return num % 1 === 0 ? parseInt(num, 10) : num
  }

  const paginatedPages = paginateInvoiceItems(items)

  return (
    <div id="service-invoice-printable-area" className="w-full">
      {paginatedPages.map((page) => (
        <TemplatePageShell
          key={page.pageIndex}
          pageIndex={page.pageIndex}
          totalPages={page.totalPages}
        >
          {/* Main Content Area */}
          <div className="relative z-10 px-7 pt-6 pb-2 space-y-3 flex-1">
            {/* Full Header */}
            <TemplateHeader
              companyName={companyName}
              companyGstin={companyGstin}
              companyPhone={companyPhone}
              companyEmail={companyEmail}
              companyAddress={companyAddress}
            />

            {/* Service Meta Bar */}
            <TemplateMetaBar
              docNumberLabel="SERVICE INVOICE NUMBER:"
              docNumber={data.service_number || data.invoice_number}
              dateLabel="SERVICE DATE:"
              dateValue={formatDate(data.service_date || data.invoice_date)}
            />

            {/* Customer Bill To Details (Single Column Mode) - FIRST PAGE ONLY */}
            {page.isFirstPage && (
              <TemplatePartyBox
                mode="single-column"
                billTitle="Billing Details"
                customerName={data.customer_name}
                customerAddress={data.customer_address}
                customerPhone={data.customer_phone}
                customerEmail={data.customer_email}
                placeOfSupply={data.place_of_supply}
                customerType={data.customer_type || 'Individual'}
                customerGstin={data.customer_gstin}
                copyType={data.copy_type}
              />
            )}

            {/* --- LINE ITEMS TABLE --- */}
            <div className="border border-gray-300 overflow-hidden text-[#292424] font-['Arial',Helvetica,sans-serif]">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-[#f3f4f6] border-b border-gray-300 text-[11px] font-bold uppercase text-[#292424]">
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-[5%]">#</th>
                    <th className="py-1.5 px-2.5 border-r border-gray-300 w-[30%]">PRODUCT &amp; MODEL</th>
                    <th className="py-1.5 px-2.5 border-r border-gray-300 w-[27%]">REPORTED ISSUE / SERVICE</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-[8%]">QTY</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-right w-[10%]">RATE</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-right w-[10%]">TAX</th>
                    <th className="py-1.5 px-2.5 text-right w-[10%]">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-[#292424] text-[10.5px] font-normal">
                  {page.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2 px-2 border-r border-gray-300 text-center font-bold align-top text-[#292424]">
                        {(page.startIndex || 0) + idx + 1}
                      </td>
                      <td className="py-2 px-2.5 border-r border-gray-300 align-top">
                        <div className="font-bold text-[#292424]">
                          {item.product_name || item.item_name || item.name}
                          {item.brand_model && (
                            <span className="text-[10.5px] font-normal text-gray-600 ml-1">
                              ({item.brand_model})
                            </span>
                          )}
                        </div>
                        {item.serial_number && item.serial_number.trim() && item.serial_number.trim() !== (item.brand_model || '').trim() && (
                          <div className="text-[10px] font-normal text-[#111827] mt-0.5">
                            S/N: {item.serial_number}
                          </div>
                        )}
                        {item.remarks && (
                          <div className="text-[10px] text-gray-600 font-medium italic mt-0.5">
                            Note: {item.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-gray-300 align-top text-gray-800">
                        <div>{item.issue_description || item.reported_issue || service?.reported_issue || 'General Service & Repair'}</div>
                      </td>
                      <td className="py-2 px-2 border-r border-gray-300 text-center align-top text-[#292424]">
                        {formatQty(item.quantity)}
                      </td>
                      <td className="py-2 px-2 border-r border-gray-300 text-right align-top text-gray-800">
                        {parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 border-r border-gray-300 text-right text-gray-600 align-top">
                        {parseFloat(item.tax_amount || 0) > 0 ? (
                          `${parseFloat(item.tax_amount).toFixed(2)}`
                        ) : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold align-top text-[#292424]">
                        {parseFloat(item.amount || (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {page.isLastPage && (
                  <tfoot>
                    <tr className="bg-[#f3f4f6] font-bold border-t border-gray-300 text-[11px] uppercase text-[#292424]">
                      <td colSpan={3} className="py-1 px-2 border-r border-gray-300 text-right uppercase">
                        Total Items: {items.length}
                      </td>
                      <td className="py-1 px-2 border-r border-gray-300 text-center text-[#292424]">
                        {formatQty(totalQty)}
                      </td>
                      <td className="py-1 px-2 border-r border-gray-300" />
                      <td className="py-1 px-2 border-r border-gray-300 text-right">
                        {totalTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-2.5 text-right text-[#292424] font-bold">
                        {totalGrossAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* --- 3-COLUMN SUMMARY --- */}
            {page.showSummary && (
              <TemplateSummaryGrid
                bankAccountName={bankAccountName}
                bankName={bankName}
                bankAccountNo={bankAccountNo}
                bankIfsc={bankIfsc}
                bankBranch={bankBranch}
                bankImageUrl={bankImageUrl}
                termsList={termsList}
                taxableAmount={taxableAmountVal}
                isGstInvoice={isGstInvoice}
                isIntraState={isIntraState}
                cgstRate={parseFloat(data.cgst_rate || effectiveSettings?.cgst_rate || 9).toFixed(2)}
                cgstAmount={cgstAmountVal}
                sgstRate={parseFloat(data.sgst_rate || effectiveSettings?.sgst_rate || 9).toFixed(2)}
                sgstAmount={sgstAmountVal}
                igstRate={parseFloat(data.igst_rate || effectiveSettings?.igst_rate || 18).toFixed(2)}
                igstAmount={igstAmountVal}
                roundOff={data.round_off}
                totalAmount={data.total_amount}
                amountInWords={data.amount_in_words}
                totalLabel="Service Total"
                signatureUrl={signatureUrl}
                companyName={companyName}
              />
            )}
          </div>

          {/* Footer Ribbon */}
          <TemplateFooterRibbon
            companyPhone={companyPhone}
            companyEmail={companyEmail}
            companyAddress={companyAddress}
          />
        </TemplatePageShell>
      ))}
    </div>
  )
}
