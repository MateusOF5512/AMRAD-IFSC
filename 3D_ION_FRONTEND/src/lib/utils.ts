/**
 * Format date to locale string (Portuguese: dd/mm/yyyy)
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime to locale string (Portuguese: dd/mm/yyyy hh:mm)
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format date with language support
 * Portuguese format: dd/mm/yyyy
 * English format: yyyy/mm/dd
 */
export function formatDateByLanguage(date: string | Date, language: string = 'pt'): string {
  const dateObj = new Date(date)
  
  if (language === 'en' || language === 'en-US' || language === 'en-GB') {
    // English format: yyyy/mm/dd
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
  
  // Portuguese format: dd/mm/yyyy (default)
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime with language support
 * Portuguese format: dd/mm/yyyy hh:mm
 * English format: yyyy/mm/dd hh:mm
 */
export function formatDateTimeByLanguage(date: string | Date, language: string = 'pt'): string {
  const dateObj = new Date(date)
  
  const hour = String(dateObj.getHours()).padStart(2, '0')
  const minute = String(dateObj.getMinutes()).padStart(2, '0')
  const time = `${hour}:${minute}`
  
  if (language === 'en' || language === 'en-US' || language === 'en-GB') {
    // English format: yyyy/mm/dd hh:mm
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}/${month}/${day} ${time}`
  }
  
  // Portuguese format: dd/mm/yyyy hh:mm (default)
  const dateString = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return `${dateString} ${time}`
}
