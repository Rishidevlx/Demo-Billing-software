import React from 'react'

export default function TemplateFooterRibbon({
  companyPhone = '8122022060',
  companyEmail = 'simchainfosolutions@gmail.com',
  companyAddress = '7A3, Thulasi Ammal Layout 2nd Street, Lakshmipuram, Peelamedu Post, Coimbatore - 641 004.'
}) {
  const cleanPhone = (companyPhone || '8122022060').toString().trim()
  let displayPhone = cleanPhone
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, '')
  if (digitsOnly.length === 10) {
    displayPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2)
    displayPhone = `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }

  return (
    <div
      className="w-full text-white flex items-center z-10 shrink-0 select-none"
      style={{
        backgroundColor: '#003882',
        height: '48px',
        padding: '0 20px',
        boxSizing: 'border-box'
      }}
    >
      {/* Left: Stacked Phone & Email */}
      <div className="flex flex-col justify-center shrink-0" style={{ gap: '3px' }}>
        {/* Phone */}
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div
            className="rounded-full bg-white flex items-center justify-center shrink-0"
            style={{ width: '15px', height: '15px' }}
          >
            <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="#003882">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <span
            className="font-bold text-white tracking-wide"
            style={{ fontSize: '8.8px', lineHeight: 1 }}
          >
            {displayPhone}
          </span>
        </div>

        {/* Email */}
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div
            className="rounded-full bg-white flex items-center justify-center shrink-0"
            style={{ width: '15px', height: '15px' }}
          >
            <svg
              width="8.5"
              height="8.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#003882"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6.5L2 7" />
            </svg>
          </div>
          <span
            className="text-white font-medium tracking-normal"
            style={{ fontSize: '8.8px', lineHeight: 1 }}
          >
            {companyEmail}
          </span>
        </div>
      </div>

      {/* Center: Slanted Diagonal White Divider (matching MasterBillPdf exact SVG line) */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: '18px', height: '48px', margin: '0 14px' }}
      >
        <svg width="18" height="48" viewBox="0 0 18 48">
          <line x1="2" y1="48" x2="16" y2="0" stroke="#ffffff" strokeWidth="2.2" />
        </svg>
      </div>

      {/* Right: MapPin & Single-Line Address */}
      <div className="flex items-center flex-1 min-w-0 overflow-hidden" style={{ gap: '7px' }}>
        <div
          className="rounded-full bg-white flex items-center justify-center shrink-0"
          style={{ width: '15px', height: '15px' }}
        >
          <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="#003882">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
          </svg>
        </div>
        <span
          className="font-bold text-white truncate leading-tight"
          style={{ fontSize: '8.8px', letterSpacing: '0.1px' }}
        >
          {companyAddress}
        </span>
      </div>
    </div>
  )
}
