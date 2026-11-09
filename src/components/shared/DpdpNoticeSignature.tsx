import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

export interface DpdpCaptureState {
  noticeId: string | null;
  acknowledged: boolean;
  signature: string | null;
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
  const [acknowledged, setAcknowledged] = useState(false);
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

  useEffect(() => {
    onChange({ noticeId: notice?.id ?? null, acknowledged, signature });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id, acknowledged, signature]);

  // A different notice (language/location change) must be acknowledged again.
  useEffect(() => { setAcknowledged(false); }, [notice?.id]);

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

      <div className="flex items-start gap-3">
        <Checkbox
          id="dpdp-ack"
          checked={acknowledged}
          disabled={disabled}
          onCheckedChange={(v) => setAcknowledged(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="dpdp-ack" className="text-sm leading-snug font-normal cursor-pointer">
          {t('dpdp.acknowledgeNotice')} <span className="text-destructive">*</span>
        </Label>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('dpdp.signatureTitle')} <span className="text-destructive">*</span></Label>
        <SignaturePad onSignatureChange={setSignature} disabled={disabled || !acknowledged} />
        {!acknowledged && <p className="text-xs text-muted-foreground">{t('dpdp.acknowledgeFirst')}</p>}
      </div>
    </div>
  );
}
