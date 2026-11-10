// REVIEW-ONLY DRAFT — not imported by the app or included in a deployed function.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { SignaturePad } from '@/components/shared/SignaturePad';

export type RequiredAcknowledgements = [boolean, boolean, boolean, boolean];

export interface DpdpCaptureState {
  noticeId: string | null;
  acknowledgements: RequiredAcknowledgements;
  signature: string | null;
}

interface Notice {
  id: string;
  location_id: string | null;
  language: string;
  version: string;
  title: string;
  body: string;
  acknowledgement_1_text: string | null;
  acknowledgement_2_text: string | null;
  acknowledgement_3_text: string | null;
  acknowledgement_4_text: string | null;
  privacy_policy_url: string | null;
  terms_of_service_url: string | null;
}

interface Props {
  locationId?: string | null;
  onChange: (state: DpdpCaptureState) => void;
  disabled?: boolean;
}

export function pickNotice(notices: Notice[], language: string, locationId?: string | null): Notice | null {
  const base = language.split('-')[0];
  return (
    notices.find(n => n.location_id === locationId && Boolean(locationId) && n.language === base) ||
    notices.find(n => !n.location_id && n.language === base) ||
    notices.find(n => n.location_id === locationId && Boolean(locationId) && n.language === 'en') ||
    notices.find(n => !n.location_id && n.language === 'en') ||
    null
  );
}

const emptyAcknowledgements = (): RequiredAcknowledgements => [false, false, false, false];

export function DpdpNoticeSignature({ locationId, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgements, setAcknowledgements] = useState<RequiredAcknowledgements>(emptyAcknowledgements);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('dpdp_privacy_notices')
      .select('id, location_id, language, version, title, body, acknowledgement_1_text, acknowledgement_2_text, acknowledgement_3_text, acknowledgement_4_text, privacy_policy_url, terms_of_service_url')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!active) return;
        setNotices((data as Notice[]) || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const notice = pickNotice(notices, i18n.language || 'en', locationId);
  const noticeTexts = notice ? [
    notice.acknowledgement_1_text,
    notice.acknowledgement_2_text,
    notice.acknowledgement_3_text,
    notice.acknowledgement_4_text,
  ] : [];
  const copyComplete = noticeTexts.length === 4 && noticeTexts.every(text => Boolean(text?.trim()))
    && notice?.privacy_policy_url === 'https://re.one/privacy-policy/'
    && notice?.terms_of_service_url === 'https://re.one/terms-of-service/';
  const allAcknowledged = acknowledgements.every(Boolean);

  // A change of notice, location or language requires fresh acknowledgements and signature.
  useEffect(() => {
    setAcknowledgements(emptyAcknowledgements());
    setSignature(null);
  }, [notice?.id, notice?.version, notice?.language, locationId]);

  useEffect(() => {
    onChange({ noticeId: notice?.id ?? null, acknowledgements, signature });
  }, [notice?.id, acknowledgements, signature, onChange]);

  if (loading) return <p className="text-sm text-muted-foreground">{t('dpdp.loadingNotice')}</p>;
  if (!notice) return <p className="text-sm text-destructive">{t('dpdp.noticeUnavailable')}</p>;
  if (!copyComplete) return <p className="text-sm text-destructive">This approved privacy notice is incomplete. Please contact reception.</p>;

  const acknowledgmentLabels = noticeTexts as [string, string, string, string];
  const fallback = notice.language !== (i18n.language || 'en').split('-')[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <span className="flex items-center gap-2 font-medium text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> {notice.title}
          </span>
          <span className="text-xs text-muted-foreground">{t('dpdp.version')} {notice.version}</span>
        </div>
        {fallback && <p className="px-4 pt-2 text-xs text-muted-foreground">{t('dpdp.noticeFallback')}</p>}
        <ScrollArea className="max-h-64 px-4 py-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{notice.body}</p>
        </ScrollArea>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={notice.privacy_policy_url ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
          {i18n.language === 'en' ? 'Privacy Policy' : 'Privacy Policy'} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a href={notice.terms_of_service_url ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
          {i18n.language === 'en' ? 'Terms of Service' : 'Terms of Service'} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <fieldset disabled={disabled} className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Visitor acknowledgements <span className="text-destructive">*</span></legend>
        {acknowledgmentLabels.map((text, index) => {
          const id = `dpdp-ack-${index + 1}`;
          return (
            <div key={id} className="flex items-start gap-3">
              <Checkbox
                id={id}
                checked={acknowledgements[index]}
                onCheckedChange={(checked) => {
                  setAcknowledgements(previous => previous.map((value, i) => i === index ? checked === true : value) as RequiredAcknowledgements);
                }}
                className="mt-0.5"
              />
              <Label htmlFor={id} className="cursor-pointer text-sm leading-snug font-normal">{text}</Label>
            </div>
          );
        })}
      </fieldset>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('dpdp.signatureTitle')} <span className="text-destructive">*</span></Label>
        <SignaturePad key={`${notice.id}:${notice.version}:${notice.language}`} onSignatureChange={setSignature} disabled={disabled || !allAcknowledged} />
        {!allAcknowledged && <p className="text-xs text-muted-foreground">Complete all four acknowledgements before signing.</p>}
      </div>
    </div>
  );
}
