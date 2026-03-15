import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const adminAccounts = [
    { email: 'admin@cfgolf.test', password: 'AdminCF2025!', full_name: 'Super Admin', admin_level: 'super_admin' },
    { email: 'moderator@cfgolf.test', password: 'AdminCF2025!', full_name: 'Moderator User', admin_level: 'moderator' },
    { email: 'support@cfgolf.test', password: 'AdminCF2025!', full_name: 'Support Staff', admin_level: 'support' },
  ]

  const results: any[] = []

  for (const acc of adminAccounts) {
    // Create or get auth user
    let userId: string | null = null

    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === acc.email)

    if (existing) {
      userId = existing.id
      // Update password to ensure it's correct
      await supabase.auth.admin.updateUserById(userId, { password: acc.password })
      results.push({ email: acc.email, status: 'existing, password updated', userId })
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      })
      if (error) {
        results.push({ email: acc.email, status: 'error', error: error.message })
        continue
      }
      userId = data.user.id
      results.push({ email: acc.email, status: 'created', userId })
    }

    if (!userId) continue

    // Update profile
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: acc.full_name,
      handicap: 0,
      location: 'Jakarta',
      bio: `${acc.admin_level} account for testing`,
    })

    // Upsert system_admin
    const { data: existingAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingAdmin) {
      await supabase.from('system_admins').insert({
        user_id: userId,
        admin_level: acc.admin_level,
        is_active: true,
        notes: 'Test admin account',
      })
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
