import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { getPool } from '../config/db.js'
import { renderTemplateText } from '../services/emailService.js'

// Helper to resolve dynamic production-ready base URL
function getAppBaseUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/+$/, '')
  }
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, '')
  }
  if (req) {
    const origin = req.get('origin')
    if (origin && origin.startsWith('http')) return origin.replace(/\/+$/, '')
    const host = req.get('host')
    if (host) return `${req.protocol}://${host}`
  }
  return 'http://localhost:5173'
}

// Helper to send email with 15-minute setup link
async function sendWelcomeEmail(email, name, rawPassword, setupLink, expiresMinutes = 15, baseUrl = 'http://localhost:5173') {
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT * FROM email_configs WHERE id = 1')
    if (rows.length === 0) return false // No config

    const config = rows[0]
    if (!config.smtp_user || !config.smtp_pass) return false

    // Fetch live settings company name
    const [sysRows] = await pool.query('SELECT company_name FROM settings WHERE id = 1 LIMIT 1')
    const companyDisplayName = (sysRows && sysRows[0]?.company_name) || config.sender_name || 'Simcha Info Solutions'

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port, 10) || 465,
      secure: Number(config.smtp_port) === 465 || Boolean(config.smtp_secure),
      auth: {
        user: config.smtp_user ? config.smtp_user.trim() : '',
        pass: config.smtp_pass ? config.smtp_pass.trim() : ''
      }
    })

    const loginUrl = `${baseUrl}/login`

    // Template custom Subject & Body with tag replacements (NO FALLBACKS)
    const vars = {
      company_name: companyDisplayName,
      user_name: name,
      name: name,
      email: email,
      temporary_password: rawPassword,
      password: rawPassword,
      setup_link: setupLink || '',
      login_url: loginUrl,
      expires_in: `${expiresMinutes} minutes`
    }

    const customSubject = renderTemplateText(config.user_invite_subject, vars)
    const customBody = renderTemplateText(config.user_invite_body, vars)

    const mailOptions = {
      from: `"${companyDisplayName}" <${config.smtp_user}>`,
      to: email,
      subject: customSubject,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #043486; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">${companyDisplayName.toUpperCase()}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Operator Account & Login Credentials</p>
          </div>
          
          <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <h2 style="color: #043486; font-size: 16px; margin-top: 0;">Welcome, ${name}!</h2>
            <p style="font-size: 14px; margin-bottom: 20px; white-space: pre-line;">
              ${customBody}
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #043486; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Login Email:</strong> <span style="font-family: monospace; color: #043486; font-weight: bold;">${email}</span></p>
              <p style="margin: 0; font-size: 13px;"><strong>Temporary Password:</strong> <span style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #1e293b;">${rawPassword}</span></p>
            </div>

            ${setupLink ? `
            <!-- Action Button for Direct Password Setup -->
            <div style="text-align: center; margin: 28px 0 20px 0;">
              <a href="${setupLink}" style="display: inline-block; background-color: #043486; color: #ffffff; font-size: 14px; font-weight: bold; padding: 12px 28px; text-decoration: none; border-radius: 4px; box-shadow: 0 2px 4px rgba(4, 52, 134, 0.2);">
                Set Custom Password Now →
              </a>
              <p style="color: #dc2626; font-size: 12px; font-weight: bold; margin-top: 10px; margin-bottom: 0;">
                ⏱️ Security Notice: This password setup link is valid for ${expiresMinutes} minutes only.
              </p>
            </div>
            ` : ''}

            <p style="font-size: 13px; color: #64748b; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
              Direct Portal Login: <a href="${loginUrl}" style="color: #043486; font-weight: 600;">${loginUrl}</a>
            </p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return false
  }
}

// Generate random password
function generateRandomPassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let pass = ''
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

export const MAX_USER_LIMIT = 5

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const pool = getPool()
    const [users] = await pool.query('SELECT id, name, email, phone, designation, department, role, status, created_at FROM users ORDER BY created_at DESC')
    res.json({
      success: true,
      users,
      maxLimit: MAX_USER_LIMIT,
      totalUsers: users.length,
      remainingSlots: Math.max(0, MAX_USER_LIMIT - users.length),
      isLimitReached: users.length >= MAX_USER_LIMIT
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message })
  }
}

// GET /api/users/:id
export const getUserById = async (req, res) => {
  try {
    const pool = getPool()
    const [users] = await pool.query('SELECT id, name, email, phone, designation, department, role, status FROM users WHERE id = ?', [req.params.id])
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({ success: true, user: users[0] })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch user details', error: error.message })
  }
}

// POST /api/users
export const createUser = async (req, res) => {
  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    const { name, email, phone, designation, department, role, status = 'Active' } = req.body

    if (!name || !email || !role) {
      conn.release()
      return res.status(400).json({ success: false, message: 'Name, Email, and Role are required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone ? phone.toString().replace(/\D/g, '').slice(-10) : null

    if (phone && cleanPhone && cleanPhone.length !== 10) {
      conn.release()
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number' })
    }

    // Begin atomic transaction to eliminate race conditions
    await conn.beginTransaction()

    // 0-Hole Enforcement: Atomic Lock & Strict User Limit Check
    const [countRows] = await conn.query('SELECT COUNT(*) as total FROM users FOR UPDATE')
    const totalUsers = Number(countRows[0]?.total || 0)

    if (totalUsers >= MAX_USER_LIMIT) {
      await conn.rollback()
      conn.release()
      return res.status(403).json({
        success: false,
        message: `License Limit Reached: Your software is strictly limited to a maximum of ${MAX_USER_LIMIT} users. To add a new user, please delete an unused user first.`
      })
    }

    // Check if email already exists
    const [existing] = await conn.query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail])
    if (existing.length > 0) {
      await conn.rollback()
      conn.release()
      return res.status(400).json({ success: false, message: 'This email address is already registered to another user.' })
    }

    // Auto-generate temporary password
    const rawPassword = generateRandomPassword(10)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(rawPassword, salt)

    const [result] = await conn.query(
      'INSERT INTO users (name, email, password, phone, designation, department, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, designation || null, department || null, role, status]
    )

    const userId = result.insertId

    // Generate 15-minute secure crypto token for direct password setup
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes validity

    await conn.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, resetToken, expiresAt]
    )

    await conn.commit()
    conn.release()

    const origin = getAppBaseUrl(req)
    const setupLink = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`

    // Attempt to send email with temporary credentials & 15-minute setup link
    const emailSent = await sendWelcomeEmail(cleanEmail, name, rawPassword, setupLink, 15, origin)

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'User created successfully and credentials with 15-minute setup link sent via email.'
        : 'User created successfully, but failed to send credentials email.',
      userId,
      setupLink,
      _tempPassword: rawPassword 
    })
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback()
      } catch {}
      conn.release()
    }
    console.error('Error creating user:', error)
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message })
  }
}

// POST /api/users/:id/resend-invite
export const resendInviteLink = async (req, res) => {
  try {
    const userId = req.params.id
    const pool = getPool()

    const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId])
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const user = users[0]

    // Generate new 10-char temporary password & new 15-minute token
    const rawPassword = generateRandomPassword(10)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(rawPassword, salt)

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id])

    // Invalidate old tokens for this user
    await pool.query('UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = ? AND is_used = FALSE', [user.id])

    // Create new 15-min token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    )

    const origin = getAppBaseUrl(req)
    const setupLink = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`

    const emailSent = await sendWelcomeEmail(user.email, user.name, rawPassword, setupLink, 15, origin)

    res.json({
      success: true,
      message: emailSent
        ? `Fresh 15-minute password setup link sent to ${user.email}.`
        : 'Failed to dispatch email. Please check SMTP configuration in Settings.',
      setupLink
    })
  } catch (error) {
    console.error('Error resending invite link:', error)
    res.status(500).json({ success: false, message: 'Failed to resend invite link', error: error.message })
  }
}

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { name, email, phone, designation, department, role, status } = req.body
    const userId = req.params.id

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Role are required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone ? phone.toString().replace(/\D/g, '').slice(-10) : null

    if (phone && cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number' })
    }

    const pool = getPool()

    // Check if target user exists
    const [userRows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId])
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const isSystemAdmin = userRows[0].role === 'Administrator' || Number(userId) === 1

    // Check if email exists for other users
    const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, userId])
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'This email address is already in use by another user.' })
    }

    const finalRole = isSystemAdmin ? 'Administrator' : role
    const finalStatus = isSystemAdmin ? 'Active' : (status || 'Active')

    await pool.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, designation = ?, department = ?, role = ?, status = ? WHERE id = ?',
      [name.trim(), cleanEmail, cleanPhone || null, designation ? designation.trim() : null, department ? department.trim() : null, finalRole, finalStatus, userId]
    )

    res.json({ success: true, message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message })
  }
}

// DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id
    const pool = getPool()

    // Fetch user details first
    const [userRows] = await pool.query('SELECT id, name, role, email FROM users WHERE id = ?', [userId])
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const targetUser = userRows[0]

    // Prevent deleting default Administrator user (role Administrator or ID 1)
    if (targetUser.role === 'Administrator' || Number(targetUser.id) === 1) {
      return res.status(400).json({
        success: false,
        message: 'System default Administrator account is protected and cannot be deleted.'
      })
    }

    // Prevent deleting self account
    if (req.user && Number(req.user.id) === Number(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in account.'
      })
    }

    await pool.query('DELETE FROM password_otps WHERE user_id = ?', [userId]).catch(() => {})
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]).catch(() => {})
    await pool.query('DELETE FROM users WHERE id = ?', [userId])

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message })
  }
}

// PATCH /api/users/:id/status
export const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id
    const pool = getPool()

    const [rows] = await pool.query('SELECT id, name, role, status FROM users WHERE id = ?', [userId])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const user = rows[0]

    // Protect Administrator user
    if (user.role === 'Administrator' || Number(user.id) === 1) {
      return res.status(400).json({
        success: false,
        message: 'System Administrator account is permanently protected and cannot be deactivated.'
      })
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId])

    res.json({
      success: true,
      message: `User status changed to ${newStatus}`,
      status: newStatus
    })
  } catch (error) {
    console.error('Error toggling user status:', error)
    res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message })
  }
}
