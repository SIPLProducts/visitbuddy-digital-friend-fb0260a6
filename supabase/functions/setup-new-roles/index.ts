import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: locations } = await supabase.from('locations').select('id, name');
    const { data: screens } = await supabase.from('screens').select('id, name, path, category');

    const findLoc = (name: string) => locations?.find(l => l.name.includes(name))?.id;
    const findScreen = (path: string) => screens?.find(s => s.path === path)?.id;

    // Create gate_security user
    const demoUsers = [
      { email: 'security@demo.com', password: '123456', fullName: 'Suresh Patil', role: 'gate_security', locationName: 'Manufacturing Plant' },
      { email: 'visitor@demo.com', password: '123456', fullName: 'Ananya Reddy', role: 'visitor', locationName: 'Tech Campus - Bangalore' },
    ];

    const results = [];
    for (const demo of demoUsers) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === demo.email);
      let userId: string;

      if (existing) {
        userId = existing.id;
      } else {
        const { data: authData, error } = await supabase.auth.admin.createUser({
          email: demo.email, password: demo.password, email_confirm: true,
          user_metadata: { full_name: demo.fullName },
        });
        if (error) { results.push({ email: demo.email, error: error.message }); continue; }
        userId = authData.user.id;
      }

      const locationId = findLoc(demo.locationName);
      if (!locationId) { results.push({ email: demo.email, error: 'Location not found' }); continue; }

      const { data: existingRole } = await supabase.from('user_location_roles')
        .select('id').eq('user_id', userId).eq('location_id', locationId).maybeSingle();
      if (!existingRole) {
        await supabase.from('user_location_roles').insert({
          user_id: userId, location_id: locationId, role: demo.role, is_ho_admin: false,
        });
      }
      results.push({ email: demo.email, status: 'ok', userId });
    }

    // Set screen permissions for gate_security at Manufacturing Plant
    const mfgId = findLoc('Manufacturing Plant');
    if (mfgId) {
      await supabase.from('role_screen_permissions').delete().eq('location_id', mfgId).eq('role', 'gate_security');
      const gateSecurityScreens = [
        { path: '/', view: true, edit: false },
        { path: '/check-in-out', view: true, edit: true },
        { path: '/visitors', view: true, edit: false },
        { path: '/badge-printing', view: true, edit: true },
        { path: '/vehicles', view: true, edit: true },
        { path: '/vehicles/new', view: true, edit: true },
        { path: '/vehicles/gate', view: true, edit: true },
        { path: '/emergency', view: true, edit: false },
        { path: '/watchlist', view: true, edit: false },
        { path: '/notifications', view: true, edit: false },
      ];
      const perms = gateSecurityScreens
        .map(s => ({ location_id: mfgId, role: 'gate_security', screen_id: findScreen(s.path), can_view: s.view, can_edit: s.edit }))
        .filter(p => p.screen_id);
      if (perms.length) await supabase.from('role_screen_permissions').insert(perms);
    }

    // Set screen permissions for visitor at Tech Campus
    const techId = findLoc('Tech Campus - Bangalore');
    if (techId) {
      await supabase.from('role_screen_permissions').delete().eq('location_id', techId).eq('role', 'visitor');
      const visitorScreens = [
        { path: '/', view: true, edit: false },
        { path: '/appointments', view: true, edit: false },
        { path: '/notifications', view: true, edit: false },
        { path: '/help', view: true, edit: false },
      ];
      const perms = visitorScreens
        .map(s => ({ location_id: techId, role: 'visitor', screen_id: findScreen(s.path), can_view: s.view, can_edit: s.edit }))
        .filter(p => p.screen_id);
      if (perms.length) await supabase.from('role_screen_permissions').insert(perms);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
