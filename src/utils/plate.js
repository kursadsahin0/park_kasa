export function normalizePlate(value) {
  return String(value || '')
    .replace(/[İı]/g, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function platesEqual(a, b) {
  const left = normalizePlate(a)
  const right = normalizePlate(b)
  return Boolean(left) && left === right
}

export function formatPlate(value) {
  const plate = normalizePlate(value)
  const match = plate.match(/^(\d{2})([A-Z]{1,3})(\d{2,4})$/)
  return match ? `${match[1]} ${match[2]} ${match[3]}` : plate
}
