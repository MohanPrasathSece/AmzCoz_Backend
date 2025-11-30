import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { sendLeadEmails } from './emailService.js'

const app = express()

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
}))

app.use(express.json())

// Add Content Security Policy header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com; frame-src 'self';"
  )
  next()
})

app.get('/', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/contact', async (req, res) => {
  const {
    name,
    email,
    phone,
    serviceType,
    platform,
    storeLink,
    category,
    challenges,
  } = req.body || {}

  if (!name || !email || !phone || !serviceType) {
    return res.status(400).json({
      error: 'Missing required fields. Name, email, phone, and serviceType are mandatory.',
    })
  }

  try {
    await sendLeadEmails({
      name,
      email,
      phone,
      serviceType,
      platform,
      storeLink,
      category,
      challenges,
    })

    res.status(200).json({ message: 'Lead submitted successfully.' })
  } catch (error) {
    console.error('Contact form submission failed:', error)
    res.status(500).json({ error: 'Unable to process your request right now.' })
  }
})

const port = Number.parseInt(process.env.PORT || '4000', 10)

app.listen(port, () => {
  console.log(`SMTP server listening on port ${port}`)
})
