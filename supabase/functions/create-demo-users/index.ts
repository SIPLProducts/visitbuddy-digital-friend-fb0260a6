import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get locations
    const { data: locations } = await supabase.from('locations').select('id, name, city').order('name');
    if (!locations || locations.length === 0) {
      return new Response(JSON.stringify({ error: 'No locations found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const demoUsers = [
      {
        email: 'manager@demo.com',
        password: '123456',
        fullName: 'Priya Sharma',
        role: 'manager' as const,
        locationName: 'Tech Campus - Bangalore',
        isHoAdmin: false,
      },
      {
        email: 'operator@demo.com',
        password: '123456',
        fullName: 'Rahul Verma',
        role: 'operator' as const,
        locationName: 'Manufacturing Plant',
        isHoAdmin: false,
      },
      {
        email: 'admin.delhi@demo.com',
        password: '123456',
        fullName: 'Amit Kumar',
        role: 'admin' as const,
        locationName: 'Regional Office - Delhi',
        isHoAdmin: false,
      },
    ];

    const results = [];

    for (const demo of demoUsers) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === demo.email);
      
      let userId: string;

      if (existing) {
        userId = existing.id;
        results.push({ email: demo.email, status: 'already exists', userId });
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: demo.email,
          password: demo.password,
          email_confirm: true,
          user_metadata: { full_name: demo.fullName },
        });

        if (authError) {
          results.push({ email: demo.email, status: 'error', error: authError.message });
          continue;
        }
        userId = authData.user.id;
        results.push({ email: demo.email, status: 'created', userId });
      }

      // Find location
      const location = locations.find(l => l.name === demo.locationName);
      if (!location) {
        results.push({ email: demo.email, note: `Location "${demo.locationName}" not found` });
        continue;
      }

      // Check if role already assigned
      const { data: existingRole } = await supabase
        .from('user_location_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('location_id', location.id)
        .maybeSingle();

      if (!existingRole) {
        await supabase.from('user_location_roles').insert({
          user_id: userId,
          location_id: location.id,
          role: demo.role,
          is_ho_admin: demo.isHoAdmin,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
