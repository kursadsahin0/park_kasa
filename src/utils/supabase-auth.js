export function supabaseAuthMessage(error) {
  const text = (error?.message || error?.error_description || '').toLowerCase()
  if (!text) return 'İşlem başarısız.'
  if (text.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (text.includes('email not confirmed')) return 'E-posta henüz onaylanmamış. Supabase’de Confirm email’i kapatabilirsin.'
  if (text.includes('user already registered')) return 'Bu e-posta zaten kayıtlı. Giriş yap.'
  if (text.includes('password')) return 'Şifre en az 6 karakter olmalı.'
  if (text.includes('rate limit')) return 'Çok fazla deneme. Biraz bekleyip tekrar dene.'
  return error.message || 'İşlem başarısız.'
}
