export const PRIVACY_DECLARATION_IDS = [
  'personalData',
  'withdrawal',
  'serviceProviders',
  'privacyPolicyTerms',
] as const;

export type PrivacyDeclarationId = (typeof PRIVACY_DECLARATION_IDS)[number];
export type PrivacyDeclarationSelection = Record<PrivacyDeclarationId, boolean>;

export const PRIVACY_DECLARATION_TEXT: Record<PrivacyDeclarationId, string> = {
  personalData:
    'I consent to the processing of my personal data for the above-mentioned purposes and confirm that the data shared is accurate and belongs to me.',
  withdrawal:
    'I understand that I can withdraw or modify my consent at any time by sending a written notice to dpo@re.one. I also understand that such withdrawal may limit or affect the services offered.',
  serviceProviders:
    'I authorize Re Sustainability Limited to share my data with its authorized service providers/vendors strictly for fulfilling the purposes described above.',
  privacyPolicyTerms:
    'I have read and accept the Privacy Policy of ReSL and Terms of Service.',
};

export function createEmptyPrivacyDeclarations(): PrivacyDeclarationSelection {
  return {
    personalData: false,
    withdrawal: false,
    serviceProviders: false,
    privacyPolicyTerms: false,
  };
}

export function acceptCombinedSharingAndPolicyDeclaration(
  declarations: PrivacyDeclarationSelection,
): PrivacyDeclarationSelection {
  return {
    ...declarations,
    serviceProviders: true,
    privacyPolicyTerms: true,
  };
}

export function areAllPrivacyDeclarationsAccepted(
  declarations: Partial<PrivacyDeclarationSelection>,
): boolean {
  return PRIVACY_DECLARATION_IDS.every((id) => declarations[id] === true);
}

export function isReOneEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase().endsWith('@re.one');
}

export function requiresPrivacyNotice(email: string | null | undefined): boolean {
  return !isReOneEmail(email);
}