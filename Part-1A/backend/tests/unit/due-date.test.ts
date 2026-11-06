import { calculateDueDate, todayInTimeZone } from '../../src/services/due-date.service';

describe('library calendar dates', () => {
  it('adds fourteen calendar days in the library time zone across a DST change', () => {
    expect(calculateDueDate(new Date('2026-03-01T04:30:00.000Z'), 'America/New_York'))
      .toBe('2026-03-14');
  });

  it('uses the requested time zone for the current calendar date', () => {
    expect(todayInTimeZone('America/Los_Angeles', new Date('2026-11-07T01:00:00.000Z')))
      .toBe('2026-11-06');
  });

  it('rejects non-positive loan periods', () => {
    expect(() => calculateDueDate(new Date(), 'UTC', 0)).toThrow(RangeError);
  });
});
