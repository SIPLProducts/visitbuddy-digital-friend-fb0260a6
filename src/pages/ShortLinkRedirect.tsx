import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) {
        navigate("/", { replace: true });
        return;
      }
      const { data, error } = await supabase.rpc("get_visitor_id_by_short_code", {
        _short_code: code.toLowerCase(),
      });
      if (cancelled) return;
      if (!error && typeof data === "string" && data.length > 0) {
        navigate(`/visitor/${data}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}