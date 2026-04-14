import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes a filename for safe use in storage paths.
 * Keeps alphanumeric chars, hyphens, underscores, and dots.
 * Strips path separators to prevent traversal attacks.
 * The original filename is preserved separately for display purposes.
 */
export function sanitizeStorageFilename(name: string): string {
  // Strip any path components (e.g. "../../etc/passwd.pdf" → "passwd.pdf")
  const base = name.replace(/\\/g, '/').split('/').pop() ?? 'upload'

  const sanitized = base
    .replace(/[^\w.\-\s]/g, '')  // remove special chars except word chars, dots, hyphens, spaces
    .replace(/\s+/g, '-')         // spaces → hyphens
    .replace(/\.{2,}/g, '.')      // collapse consecutive dots
    .replace(/^\.+|\.+$/g, '')    // strip leading/trailing dots
    .slice(0, 200)                 // cap length

  return sanitized || 'upload.pdf'
}
