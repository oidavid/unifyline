import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins + ':' + secs.toString().padStart(2, '0')
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+1 (' + cleaned.slice(1,4) + ') ' + cleaned.slice(4,7) + '-' + cleaned.slice(7)
  }
  return '+' + cleaned
}
