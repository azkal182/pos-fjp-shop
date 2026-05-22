/**
 * Timezone utilities untuk WIB (UTC+7).
 * Semua date boundary (startOfDay, endOfDay) harus dihitung dalam WIB
 * agar laporan dan kode transaksi sesuai kalender Indonesia.
 */

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000 // UTC+7

/**
 * Konversi Date ke "hari WIB" — kembalikan Date yang merepresentasikan
 * awal hari (00:00:00) dalam WIB, disimpan sebagai UTC.
 *
 * Contoh: 2026-05-23 01:00 UTC → 2026-05-23 00:00 WIB → 2026-05-22 17:00 UTC
 */
export function startOfDayWIB(date: Date): Date {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS)
  // Set ke 00:00:00.000 dalam "WIB space"
  wibDate.setUTCHours(0, 0, 0, 0)
  // Kembalikan ke UTC
  return new Date(wibDate.getTime() - WIB_OFFSET_MS)
}

/**
 * Akhir hari (23:59:59.999) dalam WIB, disimpan sebagai UTC.
 */
export function endOfDayWIB(date: Date): Date {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS)
  wibDate.setUTCHours(23, 59, 59, 999)
  return new Date(wibDate.getTime() - WIB_OFFSET_MS)
}

/**
 * Format tanggal ke string YYYY-MM-DD dalam WIB.
 * Dipakai untuk grouping laporan per hari.
 */
export function formatDateWIB(date: Date): string {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS)
  return wibDate.toISOString().slice(0, 10)
}

/**
 * Kembalikan "hari ini" dalam WIB sebagai Date (awal hari UTC).
 */
export function todayWIB(): Date {
  return startOfDayWIB(new Date())
}

/**
 * Parse string tanggal dari client (ISO string atau date string) ke Date.
 * Client mengirim tanggal dalam konteks lokal mereka (WIB),
 * jadi kita treat string YYYY-MM-DD sebagai WIB midnight.
 */
export function parseDateWIB(dateStr: string): Date {
  // Jika format YYYY-MM-DD (tanpa waktu), treat sebagai WIB midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // "2026-05-23" → 2026-05-23 00:00 WIB → 2026-05-22 17:00 UTC
    return new Date(`${dateStr}T00:00:00+07:00`)
  }
  // Jika sudah ada timezone info (ISO string), parse langsung
  return new Date(dateStr)
}
