import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const perPage = 100

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const password = 'GolfTest2025!'
  const adminPassword = 'AdminCF2025!'

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ done: true, page, message: 'No more users' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let updated = 0
  let skipped = 0

  // Process all users in parallel
  await Promise.all(users.map(async (user) => {
    const email = user.email || ''
    const isTest = email.endsWith('@test.com') || email.endsWith('@cfgolf.test') || email.endsWith('@cfgolf.id')
    if (!isTest) { skipped++; return }

    const isAdmin = email.startsWith('admin@') || email.startsWith('moderator@') || email.startsWith('support@')
    const pw = isAdmin ? adminPassword : password

    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: pw })
    if (!error) updated++
  }))

  return new Response(JSON.stringify({ 
    page, 
    users_in_page: users.length,
    updated, 
    skipped,
    has_more: users.length === perPage,
    next_page: users.length === perPage ? page + 1 : null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
