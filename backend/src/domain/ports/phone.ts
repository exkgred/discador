import { ValidationError } from '../errors/domain-error';

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new ValidationError('Telefone inválido');
  }
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('55') && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  throw new ValidationError('Telefone inválido');
}
