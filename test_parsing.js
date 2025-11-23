const parseRecipients = (value) => {
  if (!value) return []
  return value
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean)
}

const envValue = 'adnanamzcoz@gmail.com,adnan@amzcoz.com'
const recipients = parseRecipients(envValue)
console.log('Parsed recipients:', recipients)
