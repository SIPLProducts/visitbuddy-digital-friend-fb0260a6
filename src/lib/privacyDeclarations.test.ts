import { describe, expect, it } from 'vitest';
import {
  acceptCombinedSharingAndPolicyDeclaration,
  areAllPrivacyDeclarationsAccepted,
  createEmptyPrivacyDeclarations,
  PRIVACY_DECLARATION_IDS,
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
});