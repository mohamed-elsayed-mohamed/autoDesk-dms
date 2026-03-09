export function getApiErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: { message?: unknown } } }).response;
    if (res?.data?.message) {
      const msg = res.data.message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
    }
  }
  return fallback;
}

export function isConflictError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { status?: number } }).response;
    return res?.status === 409;
  }
  return false;
}
