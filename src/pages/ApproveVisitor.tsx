import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, UserCheck, AlertTriangle } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';

type ApprovalStatus = 'loading' | 'pending' | 'approved' | 'rejected' | 'error' | 'already_processed';

interface Visitor {
  id: string;
  visitor_id: string;
  name: string;
  phone: string | null;
  company: string | null;
  purpose: string | null;
  status: string;
  host?: { name: string } | null;
  department?: { name: string } | null;
  gate?: { name: string } | null;
}

export default function ApproveVisitor() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ApprovalStatus>('loading');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
    smsSkipReason?: string | null;
    smsFallback?: 'pending' | 'sent' | 'failed' | null;
  } | null>(null);
  const autoActionRanRef = useRef(false);

  const visitorId = searchParams.get('id');
  const action = searchParams.get('action') as 'approve' | 'reject' | null;

  const isValidAction = action === 'approve' || action === 'reject';

  useEffect(() => {
    autoActionRanRef.current = false;
    if (visitorId) {
      fetchVisitor();
    } else {
      setStatus('error');
    }
  }, [visitorId, action]);

  const fetchVisitor = async () => {
    if (!visitorId) return;

    try {
      const { data, error } = await supabase
        .from('visitors')
        .select(`
          id, visitor_id, name, phone, company, purpose, status,
          host:employees(name),
          department:departments(name),
          gate:gates(name)
        `)
        .eq('id', visitorId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus('error');
        return;
      }

      setVisitor(data as Visitor);

      if (data.status === 'pending_approval') {
        setStatus('pending');
        if (isValidAction && !autoActionRanRef.current) {
          autoActionRanRef.current = true;
          void handleAction(action);
        }
      } else if (data.status === 'scheduled' || data.status === 'checked_in') {
        setStatus('already_processed');
      } else if (data.status === 'cancelled') {
        setStatus('rejected');
      } else {
        setStatus('already_processed');
      }
    } catch (error) {
      console.error('Error fetching visitor:', error);
      setStatus('error');
    }
  };

  const handleAction = async (actionType: 'approve' | 'reject') => {
    if (!visitorId || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-visitor', {
        body: { visitorId, action: actionType }
      });

      if (error) throw error;

      if (data.success) {
        setStatus(actionType === 'approve' ? 'approved' : 'rejected');
        if (actionType === 'approve') {
          const n = data.notifications || {};
          const info = {
            whatsapp: !!n.whatsapp,
            sms: !!n.sms,
            email: !!n.email,
            smsSkipReason: n.smsSkipReason ?? null,
            smsFallback: null as 'pending' | 'sent' | 'failed' | null,
          };
          setDeliveryInfo(info);

          if (info.sms) {
            toast.success('Visitor approved! Badge sent via SMS.');
          } else {
            // Fallback: try send-sms-badge so the visitor always gets the SMS.
            setDeliveryInfo({ ...info, smsFallback: 'pending' });
            toast.message('Visitor approved. Resending SMS…');
            try {
              const { data: smsData, error: smsErr } = await supabase.functions.invoke('send-sms-badge', {
                body: { visitorId },
              });
              const ok = !smsErr && (smsData?.success === true || smsData?.sent === true || smsData?.sms === true);
              setDeliveryInfo({ ...info, smsFallback: ok ? 'sent' : 'failed' });
              if (ok) toast.success('SMS sent to visitor.');
              else toast.error('Approved, but SMS could not be sent. Please resend manually.');
            } catch (fbErr) {
              console.error('SMS fallback failed:', fbErr);
              setDeliveryInfo({ ...info, smsFallback: 'failed' });
              toast.error('Approved, but SMS could not be sent. Please resend manually.');
            }
          }
        } else {
          toast.success('Visitor rejected.');
        }
      } else {
        throw new Error(data.error || 'Failed to process approval');
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      if (error.message?.includes('not pending')) {
        setStatus('already_processed');
      } else {
        toast.error(error.message || 'Failed to process approval');
        setStatus('error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading visitor details...</p>
          </div>
        );

      case 'pending':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold">
                {isProcessing && isValidAction
                  ? `${action === 'approve' ? 'Approving' : 'Rejecting'} Visitor...`
                  : 'Visitor Approval Required'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isProcessing && isValidAction
                  ? 'Please wait while the request is processed.'
                  : 'Please review and approve or reject this visitor'}
              </p>
            </div>

            {visitor && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{visitor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{visitor.visitor_id}</span>
                </div>
                {visitor.company && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company:</span>
                    <span>{visitor.company}</span>
                  </div>
                )}
                {visitor.purpose && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose:</span>
                    <span>{visitor.purpose}</span>
                  </div>
                )}
                {visitor.department?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{visitor.department.name}</span>
                  </div>
                )}
                {visitor.gate?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gate:</span>
                    <span>{visitor.gate.name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
                className="flex-1 h-12"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
              <Button
                onClick={() => handleAction('approve')}
                disabled={isProcessing}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-600">Visitor Approved!</h2>
            <p className="text-muted-foreground mt-2">
              The visitor has been approved and their badge has been sent via WhatsApp and SMS.
            </p>
            {visitor && (
              <p className="mt-4 text-sm">
                <span className="font-medium">{visitor.name}</span> ({visitor.visitor_id})
              </p>
            )}
            {deliveryInfo && (
              <div className="mt-5 mx-auto max-w-xs text-left bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span className={deliveryInfo.whatsapp ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                    {deliveryInfo.whatsapp ? 'Sent' : 'Not sent'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMS</span>
                  <span className={
                    deliveryInfo.sms || deliveryInfo.smsFallback === 'sent'
                      ? 'text-emerald-600 font-medium'
                      : deliveryInfo.smsFallback === 'pending'
                        ? 'text-amber-600 font-medium'
                        : 'text-destructive font-medium'
                  }>
                    {deliveryInfo.sms
                      ? 'Sent'
                      : deliveryInfo.smsFallback === 'pending'
                        ? 'Resending…'
                        : deliveryInfo.smsFallback === 'sent'
                          ? 'Sent (fallback)'
                          : deliveryInfo.smsFallback === 'failed'
                            ? 'Failed'
                            : 'Not sent'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className={deliveryInfo.email ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                    {deliveryInfo.email ? 'Sent' : 'Not sent'}
                  </span>
                </div>
                {!deliveryInfo.sms && deliveryInfo.smsSkipReason && (
                  <div className="pt-1 text-[11px] text-muted-foreground border-t">
                    SMS reason: {deliveryInfo.smsSkipReason}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-destructive">Visitor Rejected</h2>
            <p className="text-muted-foreground mt-2">
              This visitor has been rejected and will not be granted entry.
            </p>
            {visitor && (
              <p className="mt-4 text-sm">
                <span className="font-medium">{visitor.name}</span> ({visitor.visitor_id})
              </p>
            )}
          </div>
        );

      case 'already_processed':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">Already Processed</h2>
            <p className="text-muted-foreground mt-2">
              This visitor request has already been processed.
            </p>
            {visitor && (
              <p className="mt-4 text-sm">
                Current status: <span className="font-medium capitalize">{visitor.status?.replace('_', ' ')}</span>
              </p>
            )}
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive">Error</h2>
            <p className="text-muted-foreground mt-2">
              Unable to load visitor details. The link may be invalid or expired.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={reslLogo} alt="Logo" className="h-10 w-10 object-contain" />
            <CardTitle className="text-lg">Re Sustainability</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Visitor Approval System</p>
        </CardHeader>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
