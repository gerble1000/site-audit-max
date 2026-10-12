export function createId(prefix = ''): string {
  const rand = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
    .replace(/^_+|_+$/g, '') || 'report';
}
