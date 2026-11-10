import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';
import type { TFunction } from 'i18next';
import { SignaturePad } from './SignaturePad';
import {
  areAllPrivacyDeclarationsAccepted,
  createEmptyPrivacyDeclarations,
  PRIVACY_DECLARATION_IDS,
  type PrivacyDeclarationId,
  type PrivacyDeclarationSelection,
} from '@/lib/privacyDeclarations';

export interface DpdpCaptureState {
  noticeId: string | null;
  acknowledged: boolean;
  signature: string | null;
  declarations: PrivacyDeclarationSelection;
}

interface Notice {
  id: string;
  location_id: string | null;
  language: string;
  version: string;
  title: string;
  body: string;
}

interface Props {
  locationId?: string | null;
  onChange: (state: DpdpCaptureState) => void;
  disabled?: boolean;
}

/** Picks the approved notice: location + language, then global + language, then English. */
export function pickNotice(notices: Notice[], language: string, locationId?: string | null): Notice | null {
  const base = language.split('-')[0];
  return (
    notices.find(n => n.location_id === locationId && locationId && n.language === base) ||
    notices.find(n => !n.location_id && n.language === base) ||
    notices.find(n => n.location_id === locationId && locationId && n.language === 'en') ||
    notices.find(n => !n.location_id && n.language === 'en') ||
    null
  );
}

export function DpdpNoticeSignature({ locationId, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState(createEmptyPrivacyDeclarations);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('dpdp_privacy_notices')
      .select('id, location_id, language, version, title, body')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!active) return;
        setNotices((data as Notice[]) || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const notice = pickNotice(notices, i18n.language || 'en', locationId);
  const acknowledged = areAllPrivacyDeclarationsAccepted(declarations);

  const handleDeclarationChange = (id: PrivacyDeclarationId, checked: boolean) => {
    const next = { ...declarations, [id]: checked };
    const allAccepted = areAllPrivacyDeclarationsAccepted(next);
    setDeclarations(next);
    if (!allAccepted) setSignature(null);
    onChange({
      noticeId: notice?.id ?? null,
      acknowledged: allAccepted,
      signature: allAccepted ? signature : null,
      declarations: next,
    });
  };

  useEffect(() => {
    onChange({ noticeId: notice?.id ?? null, acknowledged, signature, declarations });
  }, [notice?.id, acknowledged, signature, declarations, onChange]);

  // A different notice (language/location change) must be acknowledged and signed again.
  useEffect(() => {
    setDeclarations(createEmptyPrivacyDeclarations());
    setSignature(null);
  }, [notice?.id]);

  useEffect(() => {
    if (!acknowledged) setSignature(null);
  }, [acknowledged]);

  if (loading) return <p className="text-sm text-muted-foreground">{t('dpdp.loadingNotice')}</p>;
  if (!notice) return <p className="text-sm text-destructive">{t('dpdp.noticeUnavailable')}</p>;

  const fallback = notice.language !== (i18n.language || 'en').split('-')[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <span className="flex items-center gap-2 font-medium text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> {notice.title}
          </span>
          <span className="text-xs text-muted-foreground">{t('dpdp.version')} {notice.version}</span>
        </div>
        {fallback && <p className="px-4 pt-2 text-xs text-muted-foreground">{t('dpdp.noticeFallback')}</p>}
        <ScrollArea className="h-48 px-4 py-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{notice.body}</p>
        </ScrollArea>
      </div>

      <div className="space-y-3" aria-label={t('dpdp.declarationsTitle')}>
        <p className="text-sm font-medium">{t('dpdp.declarationsTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('dpdp.declarationsEnglishOnly')}</p>
        {PRIVACY_DECLARATION_IDS.map((id) => (
          <DeclarationCheckbox
            key={id}
            id={id}
            checked={declarations[id]}
            disabled={disabled}
            onCheckedChange={(checked) => handleDeclarationChange(id, checked)}
            t={t}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('dpdp.signatureTitle')} <span className="text-destructive">*</span></Label>
        <SignaturePad
          key={`${notice.id}-${acknowledged}`}
          onSignatureChange={setSignature}
          disabled={disabled || !acknowledged}
        />
        {!acknowledged && <p className="text-xs text-muted-foreground">{t('dpdp.acknowledgeFirst')}</p>}
      </div>
    </div>
  );
}

interface DeclarationCheckboxProps {
  id: PrivacyDeclarationId;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  t: TFunction;
}

function DeclarationCheckbox({ id, checked, disabled, onCheckedChange, t }: DeclarationCheckboxProps) {
  const checkboxId = `dpdp-${id}`;
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
        aria-required="true"
      />
      <Label htmlFor={checkboxId} className="text-sm leading-relaxed font-normal cursor-pointer">
        {id === 'privacyPolicyTerms' ? (
          <>
            {t('dpdp.declarationPrivacyPolicyLead')}{' '}
            <a href="https://re.one/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {t('dpdp.privacyPolicyLink')}
            </a>{' '}
            {t('dpdp.declarationAnd')}{' '}
            <a href="https://re.one/terms-of-service/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              {t('dpdp.termsOfServiceLink')}
            </a>.
          </>
        ) : t(`dpdp.declaration${id.charAt(0).toUpperCase()}${id.slice(1)}`)}
        <span className="text-destructive"> *</span>
      </Label>
    </div>
  );
}
