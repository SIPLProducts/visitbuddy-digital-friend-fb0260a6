import { describe, expect, it } from 'vitest';
import {
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
});