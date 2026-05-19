import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import reslLogo from '@/assets/resl-logo.png';

export default function ClickRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      navigate(`/visitor/${code}`, { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src={reslLogo} alt="Logo" className="h-14 w-14 object-contain" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Opening your visitor pass…</p>
      </div>
    </div>
  );
}