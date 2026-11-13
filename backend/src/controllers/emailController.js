import { getPool } from '../config/db.js'
import { sendInvoiceEmail, sendTestEmail } from '../services/emailService.js'

// Get current email configurations
export async function getEmailConfig(req, res) {
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        config: {
          smtp_host: 'smtp.gmail.com',
          smtp_port: 465,
          smtp_secure: true,
          smtp_user: '',
          smtp_pass: '',
          sender_name: '',
          recipient_email: '',
          auto_email_on_create: true,
          email_customer_copy: true,
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
        }
      })
    }

    const config = rows[0]
    return res.status(200).json({
      success: true,
      config: {
        ...config,
        smtp_secure: Boolean(config.smtp_secure),
        auto_email_on_create: Boolean(config.auto_email_on_create),
        email_customer_copy: config.email_customer_copy !== undefined ? Boolean(config.email_customer_copy) : true,
        sales_quotation_subject: config.sales_quotation_subject || '',
        sales_quotation_body: config.sales_quotation_body || '',
        service_quotation_subject: config.service_quotation_subject || '',
        service_quotation_body: config.service_quotation_body || '',
        sales_invoice_subject: config.sales_invoice_subject || '',
        sales_invoice_body: config.sales_invoice_body || '',
        service_invoice_subject: config.service_invoice_subject || '',
        service_invoice_body: config.service_invoice_body || '',
        sales_receipt_subject: config.sales_receipt_subject || '',
        sales_receipt_body: config.sales_receipt_body || '',
        service_receipt_subject: config.service_receipt_subject || '',
        service_receipt_body: config.service_receipt_body || '',
        user_invite_subject: config.user_invite_subject || '',
        user_invite_body: config.user_invite_body || '',
        forgot_password_subject: config.forgot_password_subject || '',
        forgot_password_body: config.forgot_password_body || ''
      }
    })
  } catch (error) {
    console.error('Error retrieving email config:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve email configurations.'
    })
  }
}

// Update email configurations
export async function updateEmailConfig(req, res) {
  try {
    const {
      smtp_host = 'smtp.gmail.com',
      smtp_port = 465,
      smtp_secure = true,
      smtp_user = '',
      smtp_pass = '',
      sender_name = '',
      recipient_email = '',
      auto_email_on_create = true,
      email_customer_copy = true,
      email_subject = '',
      email_body = '',
      user_invite_subject = '',
      user_invite_body = ''
    } = req.body

    const pool = getPool()

    await pool.query(`
      INSERT INTO email_configs (
        id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
        sender_name, recipient_email, auto_email_on_create, email_customer_copy,
        email_subject, email_body, user_invite_subject, user_invite_body
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_secure = VALUES(smtp_secure),
        smtp_user = VALUES(smtp_user),
        smtp_pass = VALUES(smtp_pass),
        sender_name = VALUES(sender_name),
        recipient_email = VALUES(recipient_email),
        auto_email_on_create = VALUES(auto_email_on_create),
        email_customer_copy = VALUES(email_customer_copy),
        email_subject = VALUES(email_subject),
        email_body = VALUES(email_body),
        user_invite_subject = VALUES(user_invite_subject),
        user_invite_body = VALUES(user_invite_body),
        updated_at = CURRENT_TIMESTAMP
    `, [
      smtp_host,
      parseInt(smtp_port, 10) || 465,
      smtp_secure ? 1 : 0,
      smtp_user.trim(),
      smtp_pass.trim(),
      sender_name.trim(),
      recipient_email.trim(),
      auto_email_on_create ? 1 : 0,
      email_customer_copy ? 1 : 0,
      email_subject.trim(),
      email_body,
      user_invite_subject ? user_invite_subject.trim() : '',
      user_invite_body
    ])

    return res.status(200).json({
      success: true,
      message: 'Email & SMTP configurations saved successfully!'
    })
  } catch (error) {
    console.error('Error updating email config:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update email configurations.'
    })
  }
}

// Test SMTP connection and send test email
export async function testSmtpConnection(req, res) {
  try {
    const config = req.body
    if (!config.smtp_user || !config.smtp_pass) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both SMTP User (Email) and App Password to test connection.'
      })
    }

    const result = await sendTestEmail(config)
    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error('Error in test SMTP:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'SMTP Test failed.'
    })
  }
}

// Dispatch Invoice PDF email for specific bill
export async function dispatchBillEmail(req, res) {
  try {
    const { billId } = req.params
    const { recipient, pdf_base64, pdfBase64 } = req.body || {}

    const result = await sendInvoiceEmail(billId, recipient, pdf_base64 || pdfBase64)
    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error('Error dispatching bill email:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dispatch bill email.'
    })
  }
}

// Update Mail Templates in database
export async function updateMailTemplates(req, res) {
  try {
    const {
      sales_quotation_subject = '',
      sales_quotation_body = '',
      service_quotation_subject = '',
      service_quotation_body = '',
      sales_invoice_subject = '',
      sales_invoice_body = '',
      service_invoice_subject = '',
      service_invoice_body = '',
      sales_receipt_subject = '',
      sales_receipt_body = '',
      service_receipt_subject = '',
      service_receipt_body = '',
      user_invite_subject = '',
      user_invite_body = '',
      forgot_password_subject = '',
      forgot_password_body = ''
    } = req.body

    const pool = getPool()

    // Ensure row id=1 exists
    await pool.query(`INSERT INTO email_configs (id) VALUES (1) ON DUPLICATE KEY UPDATE id = 1;`)

    await pool.query(`
      UPDATE email_configs SET
        sales_quotation_subject = ?,
        sales_quotation_body = ?,
        service_quotation_subject = ?,
        service_quotation_body = ?,
        sales_invoice_subject = ?,
        sales_invoice_body = ?,
        service_invoice_subject = ?,
        service_invoice_body = ?,
        sales_receipt_subject = ?,
        sales_receipt_body = ?,
        service_receipt_subject = ?,
        service_receipt_body = ?,
        user_invite_subject = ?,
        user_invite_body = ?,
        forgot_password_subject = ?,
        forgot_password_body = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      sales_quotation_subject,
      sales_quotation_body,
      service_quotation_subject,
      service_quotation_body,
      sales_invoice_subject,
      sales_invoice_body,
      service_invoice_subject,
      service_invoice_body,
      sales_receipt_subject,
      sales_receipt_body,
      service_receipt_subject,
      service_receipt_body,
      user_invite_subject,
      user_invite_body,
      forgot_password_subject,
      forgot_password_body
    ])

    return res.status(200).json({
      success: true,
      message: 'Mail templates updated successfully in database!'
    })
  } catch (error) {
    console.error('Error updating mail templates:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update mail templates: ' + error.message
    })
  }
}

