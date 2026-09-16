import { isWithinBusinessHours } from './business-hours';

describe('isWithinBusinessHours', () => {
  it('segunda 10h em SP → true', () => {
    expect(
      isWithinBusinessHours(
        new Date('2026-09-14T13:00:00.000Z'),
        '08:00',
        '18:00',
      ),
    ).toBe(true);
  });

  it('sábado → false', () => {
    expect(
      isWithinBusinessHours(
        new Date('2026-09-12T13:00:00.000Z'),
        '08:00',
        '18:00',
      ),
    ).toBe(false);
  });

  it('depois das 18h → false', () => {
    expect(
      isWithinBusinessHours(
        new Date('2026-09-14T22:00:00.000Z'),
        '08:00',
        '18:00',
      ),
    ).toBe(false);
  });
});
