import React from 'react'

export default function TemplatePartyBox({
  mode = 'two-column', // 'two-column' | 'single-column'
  billTitle = 'Billing Details',
  customerName = '',
  customerAddress = '',
  customerPhone = '',
  customerEmail = '',
  placeOfSupply = '33-Tamil Nadu',
  customerGstin = '',
  customerType = '',
  copyType = 'ORIGINAL',
  // Ship to props for two-column
  shipTitle = 'SHIP TO / DELIVERY ADDRESS',
  deliveryAddress = '',
  sameAsBilling = false,
  extraDetails = null
}) {
  const copyTag = copyType === 'DUPLICATE' ? 'DUPLICATE' : (copyType === 'TRIPLICATE' ? 'TRIPLICATE' : 'ORIGINAL')

  if (mode === 'single-column') {
    return (
      <div className="border border-gray-300 p-2.5 bg-white/80 text-[#292424] font-['Arial',Helvetica,sans-serif]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-0.5">
              {billTitle}
            </span>
            <div className="text-[10.5px] font-normal text-[#292424]">
              {customerName}
            </div>
          </div>

          {/* Copy Type Tag */}
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#292424] bg-gray-100 border border-gray-300 px-2.5 py-0.5 inline-block">
              {copyTag}
            </span>
          </div>
        </div>

        {customerAddress && (
          <p className="text-[10.5px] font-normal text-gray-700 leading-snug whitespace-pre-line mt-0.5">
            {customerAddress}
          </p>
        )}
        <div className="space-y-0.5 pt-1 text-[10.5px] font-normal text-gray-700">
          {customerPhone && (
            <div>
              <span className="font-normal text-gray-700">Mobile:</span> <span className="text-[#292424]">{customerPhone}</span>
            </div>
          )}
          {customerEmail && (
            <div>
              <span className="font-normal text-gray-700">Email:</span> <span className="text-[#292424]">{customerEmail}</span>
            </div>
          )}
          {placeOfSupply && (
            <div>
              <span className="font-normal text-gray-700">Place of Supply:</span> <span className="text-[#292424]">{placeOfSupply}</span>
            </div>
          )}
          {customerType && (
            <div>
              <span className="font-normal text-gray-700">Customer Type:</span> <span className="text-[#292424]">{customerType}</span>
            </div>
          )}
          {customerGstin && (
            <div>
              <span className="font-normal text-gray-700">GSTIN:</span> <span className="font-normal uppercase text-[#292424]">{customerGstin}</span>
            </div>
          )}
          {extraDetails}
        </div>
      </div>
    )
  }

  // Default: Two-column layout (Bill To + Ship To)
  return (
    <div className="border border-gray-300 p-2.5 bg-white/80 text-[#292424] font-['Arial',Helvetica,sans-serif]">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: BILL TO (BUYER) */}
        <div className="space-y-0.5 border-r border-gray-200 pr-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-0.5">
                {billTitle}
              </span>
              <div className="text-[10.5px] font-normal text-[#292424]">
                {customerName}
              </div>
            </div>
            {/* Copy Type Tag */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#292424] bg-gray-100 border border-gray-300 px-2 py-0.5 inline-block shrink-0">
              {copyTag}
            </span>
          </div>

          {customerAddress && (
            <p className="text-[10.5px] font-normal text-gray-700 leading-snug whitespace-pre-line mt-0.5">
              {customerAddress}
            </p>
          )}
          <div className="space-y-0.5 pt-1 text-[10.5px] font-normal text-gray-700">
            {customerPhone && (
              <div><span className="font-normal text-gray-700">Mobile:</span> <span className="text-[#292424]">{customerPhone}</span></div>
            )}
            {customerEmail && (
              <div><span className="font-normal text-gray-700">Email:</span> <span className="text-[#292424]">{customerEmail}</span></div>
            )}
            <div><span className="font-normal text-gray-700">Place of Supply:</span> <span className="text-[#292424]">{placeOfSupply || '33-Tamil Nadu'}</span></div>
            {customerGstin && (
              <div><span className="font-normal text-gray-700">GSTIN:</span> <span className="font-normal uppercase text-[#292424]">{customerGstin}</span></div>
            )}
            {extraDetails}
          </div>
        </div>

        {/* Right Column: SHIP TO / DELIVERY ADDRESS */}
        <div className="space-y-0.5 pl-1">
          <span className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-0.5">
            {shipTitle}
          </span>
          <div className="text-[10.5px] font-normal text-[#292424]">
            {customerName}
          </div>
          <p className="text-[10.5px] font-normal text-gray-700 leading-snug whitespace-pre-line mt-0.5">
            {deliveryAddress && deliveryAddress.trim() ? deliveryAddress : (customerAddress || 'Same as billing address')}
          </p>
          <div className="space-y-0.5 pt-1 text-[10.5px] font-normal text-gray-700">
            {customerPhone && (
              <div><span className="font-normal text-gray-700">Contact:</span> <span className="text-[#292424]">{customerPhone}</span></div>
            )}
            <div><span className="font-normal text-gray-700">Destination:</span> <span className="text-[#292424]">{placeOfSupply || '33-Tamil Nadu'}</span></div>
            <div className="text-[10px] text-gray-500 italic pt-0.5">
              {(!deliveryAddress || sameAsBilling || deliveryAddress === customerAddress) ? '✓ Same as billing address' : '✓ Separate Delivery Destination'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
