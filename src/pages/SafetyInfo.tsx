import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Phone, ShieldAlert, Navigation } from "lucide-react";
import reslLogo from "@/assets/resl-logo.png";

interface SafetyInfo {
  name: string;
  city: string | null;
  address: string | null;
  geo_address: string | null;
  latitude: number | null;
  longitude: number | null;
  assembly_point: string | null;
  emergency_contact: string | null;
  phone: string | null;
}

export default function SafetyInfoPage() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<SafetyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_location_safety_by_code", {
        _code: code.toLowerCase(),
      });
      if (error) {
        setError("Unable to load safety details.");
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("Safety details not found for this branch.");
      } else {
        setInfo(Array.isArray(data) ? (data[0] as SafetyInfo) : (data as SafetyInfo));
      }
      setLoading(false);
    })();
  }, [code]);

  const navUrl = info
    ? info.latitude != null && info.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`
      : info.geo_address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(info.geo_address)}`
      : null
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center pt-6 pb-4">
          <img src={reslLogo} alt="Re Sustainability" className="h-14 w-14 object-contain" />
          <h1 className="text-lg font-bold mt-3 text-center">Safety & Assembly Point</h1>
          <p className="text-xs text-muted-foreground">Re Sustainability Limited</p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {info && (
          <div className="space-y-3">
            <div className="rounded-xl border bg-card shadow-sm p-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{info.name}</p>
                  {info.geo_address && <p className="text-sm text-muted-foreground">{info.geo_address}</p>}
                  {info.address && <p className="text-xs text-muted-foreground mt-1">{info.address}</p>}
                  {info.city && <p className="text-xs text-muted-foreground">{info.city}</p>}
                </div>
              </div>
            </div>

            {info.assembly_point && (
              <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Assembly Point</p>
                </div>
                <p className="text-base font-bold text-emerald-900 dark:text-emerald-100">{info.assembly_point}</p>
                <p className="text-xs text-emerald-700/80 mt-1">Proceed here in case of emergency or evacuation.</p>
              </div>
            )}

            {info.emergency_contact && (
              <a
                href={`tel:${info.emergency_contact}`}
                className="block rounded-xl border-2 border-red-500/40 bg-red-50 dark:bg-red-950/20 p-4 active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Emergency Contact</p>
                    <p className="text-base font-bold text-red-900 dark:text-red-100">{info.emergency_contact}</p>
                  </div>
                </div>
              </a>
            )}

            {navUrl && (
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold shadow active:scale-[0.99] transition"
              >
                <Navigation className="h-5 w-5" />
                Navigate on Google Maps
              </a>
            )}

            {info.phone && (
              <div className="rounded-xl border bg-card p-3 text-center text-sm">
                Reception: <a href={`tel:${info.phone}`} className="font-semibold text-primary">{info.phone}</a>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-8">
          Powered by Sharvi Infotech
        </p>
      </div>
    </div>
  );
}