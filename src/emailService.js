import nodemailer from 'nodemailer'

const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'CONTACT_FROM_ADDRESS',
  'CONTACT_RECIPIENTS'
]

const missingVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingVars.length > 0) {
  throw new Error(`Missing required SMTP environment variables: ${missingVars.join(', ')}`)
}

const port = Number.parseInt(process.env.SMTP_PORT, 10)

if (Number.isNaN(port)) {
  throw new Error('SMTP_PORT must be a valid number')
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === 'true' || port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const parseRecipients = (value) => {
  if (!value) return []
  return value
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)
}

const fromAddress = process.env.CONTACT_FROM_ADDRESS
const ownerRecipients = parseRecipients(process.env.CONTACT_RECIPIENTS)
const bccRecipients = parseRecipients(process.env.CONTACT_BCC)
const ccRecipients = parseRecipients(process.env.CONTACT_CC)
const replyToAddress = process.env.CONTACT_REPLY_TO || fromAddress

const formatLeadSummary = (lead) => {
  const lines = [
    'A new consultation request has been submitted via the AMZCOZ website.',
    '',
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Service Type: ${lead.serviceType}`,
    `Preferred Platform: ${lead.platform || 'Not specified'}`,
    `Store / Website: ${lead.storeLink || 'Not provided'}`,
    `Category: ${lead.category || 'Not specified'}`,
    '',
    'Project Details:',
    lead.challenges || 'No additional notes were added.',
  ]

  return lines.join('\n')
}

const buildOwnerMail = (lead) => {
  const primaryRecipient = ownerRecipients[0]
  const additionalRecipients = ownerRecipients.slice(1)
  
  return {
    from: fromAddress,
    to: primaryRecipient,
    bcc: additionalRecipients.length > 0 ? additionalRecipients : (bccRecipients.length ? bccRecipients : undefined),
    cc: ccRecipients.length ? ccRecipients : undefined,
    replyTo: lead.email || replyToAddress,
    subject: `New Consultation Request – ${lead.name}`,
    text: formatLeadSummary(lead),
  }
}

const buildClientMail = (lead) => {
  const acknowledgementEnabled = process.env.SEND_CLIENT_ACK !== 'false'
  if (!acknowledgementEnabled || !lead.email) {
    return null
  }

  const messageLines = [
    `Hi ${lead.name || 'there'},`,
    '',
    "Thank you for booking a strategy session with AMZCOZ. This message confirms we've received your request and one of our specialists will be in touch within 24 hours to coordinate the session.",
    '',
    'If you need to adjust the timing or share more details, simply reply to this email or call us at +91 80072 08742.',
    '',
    'Booking summary:',
    `• Service requested: ${lead.serviceType}`,
    `• Preferred platform: ${lead.platform || 'Not specified'}`,
    lead.storeLink ? `• Store / website: ${lead.storeLink}` : null,
    lead.category ? `• Category: ${lead.category}` : null,
    '',
    'Project details provided:',
    lead.challenges || 'No additional notes were added.',
    '',
    'We appreciate the opportunity to collaborate on your Amazon growth.',
    '',
    'Warm regards,',
    'Team AMZCOZ',
  ].filter(Boolean)

  return {
    from: fromAddress,
    to: lead.email,
    replyTo: replyToAddress,
    subject: 'AMZCOZ Strategy Session Confirmation',
    text: messageLines.join('\n'),
  }
}

export const sendLeadEmails = async (lead) => {
  if (!ownerRecipients.length) {
    throw new Error('At least one CONTACT_RECIPIENTS email address must be provided')
  }

  const ownerMail = buildOwnerMail(lead)
  const clientMail = buildClientMail(lead)

  const messages = [
    { label: 'admin_notification', payload: ownerMail },
  ]

  if (clientMail) {
    messages.push({ label: 'client_confirmation', payload: clientMail })
  }

  await Promise.all(
    messages.map(async ({ label, payload }) => {
      const info = await transporter.sendMail(payload)
      console.log('Email sent', {
        type: label,
        messageId: info?.messageId,
        from: payload.from,
        to: payload.to,
      })
      return info
    }),
  )

  return { sent: messages.length }
}
