import { isEmailValid } from '../email';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../password';

describe('isEmailValid', () => {
  it.each([
    'a@b.co',
    'user@example.com',
    'first.last@example.co.uk',
    'user+tag@example.com',
    'user_name@sub.example.com',
  ])('accepts %s', (email) => {
    expect(isEmailValid(email)).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['plainaddress', 'no @ or domain'],
    ['@example.com', 'no local part'],
    ['user@', 'no domain'],
    ['user@example', 'no dot in domain'],
    ['user @example.com', 'space in local part'],
    ['user@exam ple.com', 'space in domain'],
    ['user@@example.com', 'double @'],
  ])('rejects %s (%s)', (email) => {
    expect(isEmailValid(email)).toBe(false);
  });
});

describe('isPasswordValid', () => {
  it('accepts a password meeting every requirement', () => {
    expect(isPasswordValid('Str0ng!pass')).toBe(true);
  });

  // Each case is a password that satisfies every rule except the named one,
  // so a rule silently going missing fails exactly one test rather than
  // hiding behind the others.
  it.each([
    ['length', 'Sh0rt!'],
    ['uppercase', 'str0ng!pass'],
    ['lowercase', 'STR0NG!PASS'],
    ['number', 'Strong!pass'],
    ['symbol', 'Str0ngpass'],
  ])('rejects a password missing the %s requirement', (key, password) => {
    expect(isPasswordValid(password)).toBe(false);

    const failed = PASSWORD_REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.key);
    expect(failed).toEqual([key]);
  });

  it('rejects an empty password', () => {
    expect(isPasswordValid('')).toBe(false);
  });

  it('counts a space as a special character', () => {
    // Documents current behaviour rather than asserting it's desirable: the
    // symbol rule is /[^A-Za-z0-9]/, so whitespace qualifies. If that's ever
    // tightened, this test is the reminder to decide deliberately.
    expect(PASSWORD_REQUIREMENTS.find((r) => r.key === 'symbol')?.test('Str0ng pass')).toBe(true);
  });

  it('exposes a label for every requirement, for the signup checklist', () => {
    for (const requirement of PASSWORD_REQUIREMENTS) {
      expect(requirement.label.trim().length).toBeGreaterThan(0);
    }
  });
});
