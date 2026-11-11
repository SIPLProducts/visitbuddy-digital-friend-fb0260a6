import { describe, expect, it } from 'vitest';
import {
  acceptCombinedSharingAndPolicyDeclaration,
  areAllPrivacyDeclarationsAccepted,
  createEmptyPrivacyDeclarations,
  isReOneEmail,
  PRIVACY_DECLARATION_IDS,
  requiresPrivacyNotice,
} from './privacyDeclarations';

describe('required visitor privacy declarations', () => {
  it('starts with every declaration unchecked', () => {
    expect(areAllPrivacyDeclarationsAccepted(createEmptyPrivacyDeclarations())).toBe(false);
  });

  it('requires each of the four declarations', () => {
    const accepted = {
      personalData: true,
      withdrawal: true,
      serviceProviders: true,
      privacyPolicyTerms: true,
    };

    expect(PRIVACY_DECLARATION_IDS).toHaveLength(4);
    expect(areAllPrivacyDeclarationsAccepted(accepted)).toBe(true);

    for (const id of PRIVACY_DECLARATION_IDS) {
      expect(areAllPrivacyDeclarationsAccepted({ ...accepted, [id]: false })).toBe(false);
    }
  });

  it('records both combined sharing and policy acknowledgements together', () => {
    const combined = acceptCombinedSharingAndPolicyDeclaration(createEmptyPrivacyDeclarations());

    expect(combined.serviceProviders).toBe(true);
    expect(combined.privacyPolicyTerms).toBe(true);
    expect(combined.personalData).toBe(false);
    expect(combined.withdrawal).toBe(false);
    expect(areAllPrivacyDeclarationsAccepted(combined)).toBe(false);
  });

  it('matches only the exact @re.one domain, ignoring surrounding whitespace and case', () => {
    expect(isReOneEmail(' employee@re.one ')).toBe(true);
    expect(isReOneEmail('EMPLOYEE@RE.ONE')).toBe(true);
    expect(isReOneEmail('employee@sub.re.one')).toBe(false);
    expect(isReOneEmail('employee@resustainability.com')).toBe(false);
    expect(isReOneEmail('employee@re.one.example')).toBe(false);
    expect(isReOneEmail('')).toBe(false);
  });

  it('requires the privacy notice for addresses outside @re.one', () => {
    expect(requiresPrivacyNotice('staff@re.one')).toBe(false);
    expect(requiresPrivacyNotice('visitor@example.com')).toBe(true);
  });
});