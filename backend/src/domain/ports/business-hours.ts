import { BusinessRuleError } from '../errors/domain-error';

const WEEKEND = new Set(['Sat', 'Sun']);

export function isWithinBusinessHours(
  now: Date,
  windowStart: string,
  windowEnd: string,
  timeZone = 'America/Sao_Paulo',
): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  if (WEEKEND.has(weekday)) {
    return false;
  }

  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return clock >= windowStart && clock < windowEnd;
}

export function assertCanDial(params: {
  now: Date;
  windowStart: string;
  windowEnd: string;
  timeZone: string;
  dncBlocked: boolean;
  alreadyDialing: boolean;
  campaignActive: boolean;
}): void {
  if (!params.campaignActive) {
    throw new BusinessRuleError('Campanha inativa');
  }
  if (params.dncBlocked) {
    throw new BusinessRuleError('Número na lista Não Me Perturbe');
  }
  if (params.alreadyDialing) {
    throw new BusinessRuleError('Lead já está em discagem');
  }
  if (
    !isWithinBusinessHours(
      params.now,
      params.windowStart,
      params.windowEnd,
      params.timeZone,
    )
  ) {
    throw new BusinessRuleError('Fora do horário comercial da campanha');
  }
}
