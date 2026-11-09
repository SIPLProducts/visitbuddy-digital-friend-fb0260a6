import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Eraser, Check, PenLine, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isMeaningfulSignature, type Stroke } from '@/lib/signatureValidation';

interface SignaturePadProps {
  /** Called with a PNG data URL when the visitor confirms, or null when cleared / redrawn. */
  onSignatureChange: (dataUrl: string | null) => void;
  height?: number;
  disabled?: boolean;
  className?: string;
}

const EXPORT_WIDTH = 900;

export function SignaturePad({ onSignatureChange, height = 180, disabled = false, className }: SignaturePadProps) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, height);
    ctx.strokeStyle = '#111827';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokesRef.current) {
      ctx.beginPath();
      s.forEach((p, i) => {
        const x = p.x * w, y = p.y * height;
        ctx.lineWidth = 1.5 + (p.p ?? 0.5) * 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      if (s.length === 1) ctx.lineTo(s[0].x * w + 0.1, s[0].y * height + 0.1);
      ctx.stroke();
    }
  }, [height]);

  // Strokes are stored in relative coordinates so they survive resizing / rotation.
  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(() => redraw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
      p: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const locked = disabled || confirmed;

  const onDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([point(e)]);
    setError(null);
    redraw();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || locked) return;
    e.preventDefault();
    strokesRef.current[strokesRef.current.length - 1].push(point(e));
    redraw();
  };
  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setStrokeCount(strokesRef.current.length);
  };

  const clear = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    setConfirmed(false);
    setError(null);
    onSignatureChange(null);
    redraw();
  };

  const confirm = () => {
    const w = wrapRef.current?.clientWidth || 1;
    if (!isMeaningfulSignature(strokesRef.current, w, height)) {
      setError(t('dpdp.signatureTooShort'));
      return;
    }
    // Export at a fixed resolution on a white background for consistent records.
    const out = document.createElement('canvas');
    const outH = Math.round(EXPORT_WIDTH * (height / w));
    out.width = EXPORT_WIDTH;
    out.height = Math.max(outH, 200);
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.strokeStyle = '#111827';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    for (const s of strokesRef.current) {
      ctx.beginPath();
      s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * out.width, p.y * out.height) : ctx.lineTo(p.x * out.width, p.y * out.height)));
      ctx.stroke();
    }
    setConfirmed(true);
    onSignatureChange(out.toDataURL('image/png'));
  };

  const redrawSignature = () => {
    setConfirmed(false);
    onSignatureChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={wrapRef}
        className={cn(
          'relative rounded-lg border-2 bg-background overflow-hidden',
          confirmed ? 'border-primary' : 'border-dashed border-border',
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn('block touch-none select-none', locked ? 'cursor-not-allowed' : 'cursor-crosshair')}
          style={{ touchAction: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          aria-label={t('dpdp.signatureTitle')}
          role="img"
        />
        {strokeCount === 0 && !confirmed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">{t('dpdp.signHere')}</p>
          </div>
        )}
        {confirmed && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            <Lock className="h-3 w-3" /> {t('dpdp.signatureLocked')}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('dpdp.signatureInstructions')}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {confirmed && (
        <p className="text-sm text-primary flex items-center gap-1"><Check className="h-4 w-4" /> {t('dpdp.signatureConfirmed')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {!confirmed ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={clear} disabled={disabled || strokeCount === 0} className="gap-1">
              <Eraser className="h-4 w-4" /> {t('dpdp.clearSignature')}
            </Button>
            <Button type="button" size="sm" onClick={confirm} disabled={disabled || strokeCount === 0} className="gap-1">
              <Check className="h-4 w-4" /> {t('dpdp.confirmSignature')}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" onClick={redrawSignature} disabled={disabled} className="gap-1">
              <PenLine className="h-4 w-4" /> {t('dpdp.redrawSignature')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled} className="gap-1">
              <Eraser className="h-4 w-4" /> {t('dpdp.clearSignature')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
