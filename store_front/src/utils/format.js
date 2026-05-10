export const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString('es-CL')}`

export const formatDate = (value) => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('es-CL')
  } catch {
    return value
  }
}

export const formatDateShort = (value) => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('es-CL')
  } catch {
    return value
  }
}

export const formatAmount = (amount) => {
  const value = Number(amount)
  if (Number.isNaN(value)) return amount ?? '-'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}
