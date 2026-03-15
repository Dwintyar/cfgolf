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

  const password = 'GolfTest2025!'
  const adminPassword = 'AdminCF2025!'

  // List all users (paginated)
  let allUsers: any[] = []
  let page = 1
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) { console.error('listUsers error:', error.message); break }
    if (!users || users.length === 0) break
    allUsers = allUsers.concat(users)
    page++
  }

  console.log(`Total users found: ${allUsers.length}`)

  let updated = 0
  let errors = 0
  const batchSize = 10

  for (let i = 0; i < allUsers.length; i += batchSize) {
    const batch = allUsers.slice(i, i + batchSize)
    const promises = batch.map(async (user: any) => {
      // Skip real users (non-test emails)
      const email = user.email || ''
      const isTest = email.endsWith('@test.com') || email.endsWith('@cfgolf.test') || email.endsWith('@cfgolf.id')
      if (!isTest) {
        console.log(`Skipping real user: ${email}`)
        return
      }

      // Admin accounts get admin password
      const isAdmin = email.startsWith('admin@') || email.startsWith('moderator@') || email.startsWith('support@')
      const pw = isAdmin ? adminPassword : password

      const { error } = await supabase.auth.admin.updateUserById(user.id, { password: pw })
      if (error) {
        console.error(`Error updating ${email}:`, error.message)
        errors++
      } else {
        updated++
      }
    })
    await Promise.all(promises)
    console.log(`Progress: ${Math.min(i + batchSize, allUsers.length)}/${allUsers.length}`)
  }

  return new Response(JSON.stringify({ 
    success: true, 
    total_users: allUsers.length,
    updated, 
    errors,
    credentials: {
      test_users: { password: 'GolfTest2025!' },
      admin_users: { password: 'AdminCF2025!' }
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
