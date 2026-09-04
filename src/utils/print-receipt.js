import { dateTime, methodLabel, money } from '@/utils/format'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function receiptHtml(receipt) {
  const lines = (receipt.lines || [])
    .map((line) => {
      const value =
        line.label === 'Giriş' || line.label === 'Çıkış' || line.label === 'Başlangıç' || line.label === 'Bitiş'
          ? dateTime(line.value)
          : line.label === 'Ücret' || line.label === 'Saatlik'
            ? money(line.value)
            : line.value
      return `<div class="row"><span>${escapeHtml(line.label)}</span><span>${escapeHtml(value)}</span></div>`
    })
    .join('')

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(receipt.title)} ${escapeHtml(receipt.receiptNo)}</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 16px; color: #111; }
    .ticket { width: 280px; margin: 0 auto; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #555; font-size: 12px; }
    .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin: 6px 0; }
    .plate { font-size: 20px; font-weight: 700; letter-spacing: 0.08em; margin: 12px 0; }
    .total { border-top: 1px dashed #333; margin-top: 12px; padding-top: 10px; font-size: 16px; font-weight: 700; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="ticket">
    <h1>${escapeHtml(receipt.lotName)}</h1>
    <div class="muted">${escapeHtml(receipt.lotAddress || '')}</div>
    <div class="muted">${escapeHtml(receipt.title)} · ${escapeHtml(receipt.receiptNo)}</div>
    <div class="plate">${escapeHtml(receipt.plate)}</div>
    ${receipt.fullName ? `<div class="muted">${escapeHtml(receipt.fullName)}</div>` : ''}
    ${lines}
    <div class="row total"><span>Toplam</span><span>${escapeHtml(money(receipt.total))}</span></div>
    <div class="row"><span>Ödeme</span><span>${escapeHtml(receipt.method ? methodLabel(receipt.method) : '—')}</span></div>
    <div class="muted">${escapeHtml(dateTime(receipt.issuedAt))}</div>
    <div class="muted" style="margin-top:10px;font-size:10px;line-height:1.35">İşletme kaydı. ÖKC / e-fatura / mali fiş değildir. Vergi belgesi gişedeki mali cihaz veya muhasebedir.</div>
  </div>
</body>
</html>`
}

export function downloadReceipt(receipt) {
  if (!receipt) return
  const blob = new Blob([receiptHtml(receipt)], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${receipt.receiptNo || 'fis'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export function printReceipt(receipt) {
  if (!receipt) return
  const html = receiptHtml(receipt)
  if (window.parkkasa?.printHtml) {
    window.parkkasa.printHtml(html)
    return
  }
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } finally {
      setTimeout(() => frame.remove(), 800)
    }
  }, 80)
}
