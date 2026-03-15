import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const firstNames = [
  'Adi','Agus','Ahmad','Andi','Arief','Bambang','Budi','Cahyo','Dedi','Denny',
  'Eko','Fajar','Gunawan','Hadi','Hendra','Irwan','Joko','Kurniawan','Lukman','Muhammad',
  'Nanda','Oscar','Putra','Rizky','Slamet','Teguh','Umar','Wawan','Yanto','Zainal',
  'Ayu','Bella','Citra','Dewi','Eka','Fitri','Gita','Hana','Indah','Juli',
  'Kartini','Lina','Maya','Nina','Ovi','Putri','Ratna','Sari','Tika','Wulan',
  'Arman','Bayu','Candra','Dani','Faris','Galih','Haris','Ivan','Kevin','Leo',
  'Mikael','Niko','Prasetyo','Randi','Surya','Tommy','Vino','Wahyu','Yoga','Zaki',
  'Anisa','Bunga','Dian','Elsa','Fiona','Grace','Intan','Jasmine','Karina','Lestari',
  'Melati','Nadia','Olivia','Patricia','Rina','Sarah','Tiara','Ulfa','Vera','Winda',
  'Reza','Satria','Taufik','Udin','Yusuf','Angga','Bima','Dimas','Gilang','Herman'
]
const lastNames = [
  'Wijaya','Santoso','Kusuma','Pratama','Nugroho','Saputra','Hidayat','Setiawan','Wibowo','Suryadi',
  'Purnama','Gunawan','Lesmana','Hartono','Susanto','Utama','Permana','Kurniadi','Firmansyah','Hakim',
  'Budiman','Cahyadi','Darmawan','Effendi','Firdaus','Gondokusumo','Halim','Iskandar','Jaya','Kartawijaya',
  'Laksmana','Mahendra','Natalegawa','Oesman','Pranoto','Rachman','Sudirman','Tanuwijaya','Utomo','Valentino'
]
const locations = [
  'Jakarta Selatan','Jakarta Utara','Jakarta Barat','Tangerang','Bekasi','Bandung',
  'Surabaya','Semarang','Yogyakarta','Bali','Medan','Makassar','Bogor','Depok','Malang'
]

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)] }
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const phase = url.searchParams.get('phase') ?? '1'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (phase === '1') {
      // ============ PHASE 1: Create 500 auth users ============
      console.log('Phase 1: Creating 500 auth users...')
      let created = 0
      const batchSize = 25

      for (let batch = 0; batch < 500; batch += batchSize) {
        const promises = []
        for (let i = batch; i < Math.min(batch + batchSize, 500); i++) {
          const fn = pick(firstNames)
          const ln = pick(lastNames)
          promises.push(
            supabase.auth.admin.createUser({
              email: `golfer${i + 1}@cfgolf.test`,
              password: 'GolfTest2025!',
              email_confirm: true,
              user_metadata: { full_name: `${fn} ${ln}` },
            }).then(res => {
              if (res.error && !res.error.message.includes('already been registered')) {
                console.error(`User ${i + 1} error:`, res.error.message)
              } else {
                created++
              }
              return res
            })
          )
        }
        await Promise.all(promises)
        console.log(`Batch done: ${Math.min(batch + batchSize, 500)}/500`)
      }

      // Update profiles with handicap/location/bio
      console.log('Updating profiles...')
      const { data: allProfiles } = await supabase.from('profiles').select('id').order('created_at')
      if (allProfiles) {
        for (let i = 0; i < allProfiles.length; i += 50) {
          const batch = allProfiles.slice(i, i + 50)
          const updates = batch.map(p =>
            supabase.from('profiles').update({
              handicap: rand(0, 36),
              location: pick(locations),
              bio: `Golfer sejak ${rand(2005, 2023)}. Passionate about the game.`,
            }).eq('id', p.id)
          )
          await Promise.all(updates)
        }
      }

      return new Response(JSON.stringify({ success: true, phase: 1, created, total_profiles: allProfiles?.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (phase === '2') {
      // ============ PHASE 2: Clubs, Courses, Members, Staff ============
      console.log('Phase 2: Clubs, courses, members, staff...')

      const { data: profiles } = await supabase.from('profiles').select('id, handicap').order('created_at')
      if (!profiles || profiles.length === 0) throw new Error('No profiles found. Run phase 1 first.')

      const clubPrefixes = ['Royal','Grand','Emerald','Golden','Imperial','Palm','Eagle','Sunset','Blue Sky','Green Valley']
      const clubSuffixes = ['Golf & Country Club','Golf Club','Golf Resort','Golf Estate','Golf Links']
      const rangePrefixes = ['Pro','Elite','Champion','Star','Power','Ace','Top','Master','Prime','Victory']
      const rangeSuffixes = ['Driving Range','Golf Range','Practice Center','Golf Academy','Golf Studio']
      const courseNames18 = [
        'Championship Course','Lake Course','Mountain Course','Garden Course','Heritage Course',
        'Plantation Course','Ocean Course','Valley Course','Forest Course','Sunset Course',
        'Eagle Course','Palm Course','Royal Course','Crown Course','Phoenix Course',
        'Dragon Course','Tiger Course','Lion Course','Falcon Course','Hawk Course'
      ]

      // --- CLUBS ---
      const clubs: any[] = []
      for (let i = 0; i < 20; i++) {
        clubs.push({
          id: crypto.randomUUID(),
          name: `${clubPrefixes[i % clubPrefixes.length]} ${clubSuffixes[i % clubSuffixes.length]}`,
          description: `Premier golf destination in ${pick(locations)}`,
          owner_id: profiles[i].id,
          is_personal: false,
        })
      }
      for (let i = 0; i < 10; i++) {
        clubs.push({
          id: crypto.randomUUID(),
          name: `${rangePrefixes[i]} ${rangeSuffixes[i % rangeSuffixes.length]}`,
          description: `Top driving range in ${pick(locations)}`,
          owner_id: profiles[20 + i].id,
          is_personal: false,
        })
      }
      const { error: clubErr } = await supabase.from('clubs').insert(clubs)
      if (clubErr) console.error('clubs error:', clubErr.message)
      else console.log('30 clubs created')

      // --- COURSES & HOLES ---
      const courses: any[] = []
      const courseHoles: any[] = []
      const courseTees: any[] = []

      for (let i = 0; i < 20; i++) {
        const courseId = crypto.randomUUID()
        courses.push({
          id: courseId, club_id: clubs[i].id, name: courseNames18[i], location: pick(locations),
          description: `Beautiful 18-hole course at ${clubs[i].name}`, holes_count: 18,
          par: rand(70, 72), green_fee_price: rand(500, 3000) * 1000,
        })
        const parDist = shuffle([4,4,4,4,4,4,4,4,4,4,3,3,3,3,5,5,5,5])
        for (let h = 1; h <= 18; h++) {
          courseHoles.push({
            id: crypto.randomUUID(), course_id: courseId, hole_number: h, par: parDist[h - 1],
            distance_yards: parDist[h-1] === 3 ? rand(130,220) : parDist[h-1] === 4 ? rand(320,450) : rand(480,580),
            handicap_index: h,
          })
        }
        for (const t of [
          { tee_name: 'Black', color: '#000000', rating: +(73 + Math.random()*2).toFixed(1), slope: rand(130,145) },
          { tee_name: 'Blue', color: '#0000FF', rating: +(71 + Math.random()*2).toFixed(1), slope: rand(125,138) },
          { tee_name: 'White', color: '#FFFFFF', rating: +(69 + Math.random()*2).toFixed(1), slope: rand(118,132) },
          { tee_name: 'Red', color: '#FF0000', rating: +(67 + Math.random()*2).toFixed(1), slope: rand(112,126) },
        ]) {
          courseTees.push({ id: crypto.randomUUID(), course_id: courseId, ...t })
        }
      }
      // Driving range short courses
      for (let i = 0; i < 10; i++) {
        const courseId = crypto.randomUUID()
        courses.push({
          id: courseId, club_id: clubs[20 + i].id, name: `${clubs[20+i].name} Bays`,
          location: pick(locations), description: 'Driving range practice bays', holes_count: 9, par: 27,
          green_fee_price: rand(50, 200) * 1000,
        })
        for (let h = 1; h <= 9; h++) {
          courseHoles.push({
            id: crypto.randomUUID(), course_id: courseId, hole_number: h, par: 3,
            distance_yards: rand(80, 250), handicap_index: h,
          })
        }
      }

      for (let i = 0; i < courses.length; i += 30) {
        await supabase.from('courses').insert(courses.slice(i, i + 30))
      }
      for (let i = 0; i < courseHoles.length; i += 100) {
        await supabase.from('course_holes').insert(courseHoles.slice(i, i + 100))
      }
      await supabase.from('course_tees').insert(courseTees)
      console.log('Courses done')

      // --- MEMBERS ---
      const members: any[] = []
      const memberSet = new Set<string>()
      // Owners
      for (let i = 0; i < 30; i++) {
        const key = `${clubs[i].id}-${profiles[i].id}`
        members.push({ id: crypto.randomUUID(), club_id: clubs[i].id, user_id: profiles[i].id, role: 'owner' })
        memberSet.add(key)
      }
      // Admins
      for (let i = 0; i < 20; i++) {
        const idx = 30 + i * 2
        if (idx < profiles.length) {
          const key = `${clubs[i].id}-${profiles[idx].id}`
          if (!memberSet.has(key)) {
            members.push({ id: crypto.randomUUID(), club_id: clubs[i].id, user_id: profiles[idx].id, role: 'admin' })
            memberSet.add(key)
          }
        }
      }
      // Regular members
      for (let i = 30; i < profiles.length; i++) {
        const numClubs = rand(1, 3)
        for (const c of shuffle(clubs.slice(0, 20)).slice(0, numClubs)) {
          const key = `${c.id}-${profiles[i].id}`
          if (!memberSet.has(key)) {
            members.push({ id: crypto.randomUUID(), club_id: c.id, user_id: profiles[i].id, role: 'member' })
            memberSet.add(key)
          }
        }
      }
      for (let i = 0; i < members.length; i += 100) {
        const { error } = await supabase.from('members').insert(members.slice(i, i + 100))
        if (error) console.error('members error:', error.message)
      }
      console.log(`${members.length} members done`)

      // --- STAFF ---
      const staffRecords: any[] = []
      const staffRoles = ['caddy','caddy','caddy','caddy','caddy','marshal','starter','pro','staff','staff']
      for (let i = 0; i < 20; i++) {
        const clubMems = members.filter(m => m.club_id === clubs[i].id && m.role === 'member')
        const staffCount = Math.min(rand(8, 12), clubMems.length)
        const usedKeys = new Set<string>()
        for (let s = 0; s < staffCount; s++) {
          const role = staffRoles[s % staffRoles.length]
          const key = `${clubs[i].id}-${clubMems[s].user_id}-${role}`
          if (!usedKeys.has(key)) {
            staffRecords.push({
              id: crypto.randomUUID(), club_id: clubs[i].id, user_id: clubMems[s].user_id,
              staff_role: role, status: 'active',
            })
            usedKeys.add(key)
          }
        }
      }
      for (let i = 0; i < staffRecords.length; i += 100) {
        await supabase.from('club_staff').insert(staffRecords.slice(i, i + 100))
      }
      console.log(`${staffRecords.length} staff done`)

      // Store club IDs for phase 3
      return new Response(JSON.stringify({
        success: true, phase: 2,
        clubs: clubs.length, courses: courses.length, members: members.length, staff: staffRecords.length,
        club_ids: clubs.map(c => c.id),
        course_ids: courses.filter(c => c.holes_count === 18).map(c => c.id),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (phase === '3') {
      // ============ PHASE 3: Tours, Flights, Events, and full event data ============
      console.log('Phase 3: Tours, flights, events with full data...')

      const { data: profiles } = await supabase.from('profiles').select('id, handicap').order('created_at')
      const { data: allClubs } = await supabase.from('clubs').select('id, name').eq('is_personal', false).order('created_at')
      const { data: allCourses } = await supabase.from('courses').select('id, club_id, par, holes_count').eq('holes_count', 18)
      const { data: allMembers } = await supabase.from('members').select('id, club_id, user_id, role')
      const { data: allStaff } = await supabase.from('club_staff').select('id, club_id, user_id, staff_role').eq('staff_role', 'caddy')

      if (!profiles?.length || !allClubs?.length || !allCourses?.length) {
        throw new Error('Missing data. Run phase 1 and 2 first.')
      }

      const clubs = allClubs!
      const golfCourses = allCourses!
      const members = allMembers ?? []
      const caddyStaff = allStaff ?? []

      // --- TOURS ---
      const tour1Id = crypto.randomUUID()
      const tour2Id = crypto.randomUUID()
      await supabase.from('tours').insert([
        { id: tour1Id, name: 'CFGolf Championship Series 2025', organizer_club_id: clubs[0].id, tournament_type: 'internal', year: 2025, description: 'Annual internal championship with monthly events.' },
        { id: tour2Id, name: 'CFGolf Interclub Cup 2025', organizer_club_id: clubs[1].id, tournament_type: 'interclub', year: 2025, description: 'Prestigious interclub competition.' },
      ])
      console.log('Tours created')

      // --- TOUR CLUBS ---
      const tourClubs: any[] = []
      for (let i = 0; i < 6; i++) {
        tourClubs.push({ id: crypto.randomUUID(), tour_id: tour1Id, club_id: clubs[i].id, status: 'accepted', ticket_quota: rand(6, 12) })
      }
      for (let i = 2; i < 8; i++) {
        tourClubs.push({ id: crypto.randomUUID(), tour_id: tour2Id, club_id: clubs[i].id, status: 'accepted', ticket_quota: rand(6, 12) })
      }
      await supabase.from('tour_clubs').insert(tourClubs)

      // --- FLIGHTS ---
      const flights: any[] = []
      for (const tid of [tour1Id, tour2Id]) {
        flights.push(
          { id: crypto.randomUUID(), tour_id: tid, flight_name: 'Flight A', hcp_min: 0, hcp_max: 12, display_order: 1 },
          { id: crypto.randomUUID(), tour_id: tid, flight_name: 'Flight B', hcp_min: 13, hcp_max: 24, display_order: 2 },
          { id: crypto.randomUUID(), tour_id: tid, flight_name: 'Flight C', hcp_min: 25, hcp_max: 36, display_order: 3 },
        )
      }
      await supabase.from('tournament_flights').insert(flights)

      // --- WINNER CATEGORIES ---
      const winCats: any[] = []
      for (const tid of [tour1Id, tour2Id]) {
        const tf = flights.filter(f => f.tour_id === tid)
        let ord = 1
        winCats.push(
          { id: crypto.randomUUID(), tour_id: tid, category_name: 'Overall Best Gross', calculation_type: 'gross', rank_count: 3, display_order: ord++, flight_id: null },
          { id: crypto.randomUUID(), tour_id: tid, category_name: 'Overall Best Net', calculation_type: 'net', rank_count: 3, display_order: ord++, flight_id: null },
        )
        for (const f of tf) {
          winCats.push(
            { id: crypto.randomUUID(), tour_id: tid, category_name: `${f.flight_name} Best Gross`, calculation_type: 'gross', rank_count: 3, display_order: ord++, flight_id: f.id },
            { id: crypto.randomUUID(), tour_id: tid, category_name: `${f.flight_name} Best Net`, calculation_type: 'net', rank_count: 3, display_order: ord++, flight_id: f.id },
          )
        }
      }
      await supabase.from('tournament_winner_categories').insert(winCats)

      // --- TOUR PLAYERS ---
      const tourPlayers: any[] = []
      for (const tid of [tour1Id, tour2Id]) {
        const tcs = tourClubs.filter(tc => tc.tour_id === tid)
        const registered = new Set<string>()
        for (const tc of tcs) {
          const clubMems = members.filter(m => m.club_id === tc.club_id)
          const count = Math.min(rand(15, 30), clubMems.length)
          for (const m of shuffle(clubMems).slice(0, count)) {
            const key = `${tid}-${m.user_id}`
            if (!registered.has(key)) {
              tourPlayers.push({ id: crypto.randomUUID(), tour_id: tid, club_id: tc.club_id, player_id: m.user_id, status: 'active' })
              registered.add(key)
            }
          }
        }
      }
      for (let i = 0; i < tourPlayers.length; i += 100) {
        await supabase.from('tour_players').insert(tourPlayers.slice(i, i + 100))
      }
      console.log(`${tourPlayers.length} tour players registered`)

      // --- EVENTS (12 per tour) ---
      const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
      const events: any[] = []

      for (let m = 0; m < 12; m++) {
        const day = rand(10, 25)
        events.push({
          id: crypto.randomUUID(), tour_id: tour1Id,
          name: `Championship Series Leg ${m + 1}`,
          event_date: `2025-${months[m]}-${String(day).padStart(2, '0')}`,
          course_id: golfCourses[m % golfCourses.length].id,
          status: m < 6 ? 'completed' : m === 6 ? 'active' : 'draft',
          ticket_total: rand(40, 60),
        })
        events.push({
          id: crypto.randomUUID(), tour_id: tour2Id,
          name: `Interclub Cup Round ${m + 1}`,
          event_date: `2025-${months[m]}-${String(day + 1).padStart(2, '0')}`,
          course_id: golfCourses[(m + 5) % golfCourses.length].id,
          status: m < 6 ? 'completed' : m === 6 ? 'active' : 'draft',
          ticket_total: rand(40, 60),
        })
      }
      const { error: evErr } = await supabase.from('events').insert(events)
      if (evErr) console.error('events error:', evErr.message)
      console.log(`${events.length} events created`)

      // --- PER-EVENT DATA ---
      for (const event of events) {
        const tPlayers = tourPlayers.filter(tp => tp.tour_id === event.tour_id)
        const eTourClubs = tourClubs.filter(tc => tc.tour_id === event.tour_id)
        const eTourFlights = flights.filter(f => f.tour_id === event.tour_id)
        const eCourse = golfCourses.find(c => c.id === event.course_id)

        const numContestants = Math.min(rand(30, 45), tPlayers.length)
        const selectedPlayers = shuffle(tPlayers).slice(0, numContestants)

        // TICKETS
        const tickets: any[] = []
        let ticketNum = 1
        for (const tc of eTourClubs) {
          const clubPlrs = selectedPlayers.filter(sp => sp.club_id === tc.club_id)
          for (const cp of clubPlrs) {
            tickets.push({ id: crypto.randomUUID(), event_id: event.id, club_id: tc.club_id, ticket_number: ticketNum++, status: 'assigned', assigned_player_id: cp.player_id })
          }
          // Unassigned tickets
          for (let t = 0; t < rand(1, 2); t++) {
            tickets.push({ id: crypto.randomUUID(), event_id: event.id, club_id: tc.club_id, ticket_number: ticketNum++, status: 'available', assigned_player_id: null })
          }
        }
        if (tickets.length) await supabase.from('tickets').insert(tickets)

        // CONTESTANTS
        const contestants: any[] = []
        for (const sp of selectedPlayers) {
          const profile = profiles!.find(p => p.id === sp.player_id)
          const hcp = profile?.handicap ?? rand(0, 36)
          let flightId: string | null = null
          for (const f of eTourFlights) {
            if (hcp >= f.hcp_min && hcp <= f.hcp_max) { flightId = f.id; break }
          }
          const ticket = tickets.find(t => t.assigned_player_id === sp.player_id)
          contestants.push({
            id: crypto.randomUUID(), event_id: event.id, player_id: sp.player_id,
            hcp, flight_id: flightId, ticket_id: ticket?.id ?? null, status: 'competitor',
          })
        }
        if (contestants.length) await supabase.from('contestants').insert(contestants)

        // For non-draft events: checkins, carts, caddies, pairings
        if (event.status !== 'draft') {
          // CHECKINS
          const checkins = contestants.map((c, i) => ({
            id: crypto.randomUUID(), event_id: event.id, contestant_id: c.id,
            bag_drop_number: i + 1, locker_number: i + 1,
          }))
          if (checkins.length) await supabase.from('event_checkins').insert(checkins)

          // CART ASSIGNMENTS
          const carts = contestants.map((c, i) => ({
            id: crypto.randomUUID(), event_id: event.id, contestant_id: c.id, cart_number: Math.floor(i / 2) + 1,
          }))
          if (carts.length) await supabase.from('golf_cart_assignments').insert(carts)

          // CADDY ASSIGNMENTS (60%)
          if (caddyStaff.length > 0) {
            const caddyConts = shuffle(contestants).slice(0, Math.floor(contestants.length * 0.6))
            const caddyAssigns = caddyConts.map((c, i) => ({
              id: crypto.randomUUID(), event_id: event.id, contestant_id: c.id,
              caddy_id: caddyStaff[i % caddyStaff.length].user_id,
            }))
            if (caddyAssigns.length) await supabase.from('caddy_assignments').insert(caddyAssigns)
          }

          // PAIRINGS
          const shuffledConts = shuffle(contestants)
          const pairings: any[] = []
          const pairingPlayers: any[] = []
          const numGroups = Math.ceil(shuffledConts.length / 4)
          for (let g = 0; g < numGroups; g++) {
            const pId = crypto.randomUUID()
            const hour = 7 + Math.floor(g / 4)
            const minute = (g % 4) * 10
            pairings.push({
              id: pId, event_id: event.id, group_number: g + 1,
              tee_time: `${event.event_date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`,
              start_type: 'tee_time', start_hole: 1,
            })
            for (let p = 0; p < 4; p++) {
              const idx = g * 4 + p
              if (idx < shuffledConts.length) {
                pairingPlayers.push({
                  id: crypto.randomUUID(), pairing_id: pId, contestant_id: shuffledConts[idx].id,
                  position: p + 1, cart_number: Math.floor(idx / 2) + 1,
                })
              }
            }
          }
          if (pairings.length) await supabase.from('pairings').insert(pairings)
          if (pairingPlayers.length) await supabase.from('pairing_players').insert(pairingPlayers)
        }

        // SCORING (completed events only)
        if (event.status === 'completed') {
          // Get course holes
          const { data: eventHoles } = await supabase.from('course_holes').select('*').eq('course_id', event.course_id).order('hole_number')
          if (eventHoles && eventHoles.length > 0) {
            const roundId = crypto.randomUUID()
            await supabase.from('rounds').insert({
              id: roundId, course_id: event.course_id, created_by: profiles![0].id,
              status: 'completed', started_at: `${event.event_date}T07:00:00Z`, finished_at: `${event.event_date}T14:00:00Z`,
            })

            // Round players
            const rps = contestants.map(c => ({ id: crypto.randomUUID(), round_id: roundId, user_id: c.player_id }))
            for (let i = 0; i < rps.length; i += 50) {
              await supabase.from('round_players').insert(rps.slice(i, i + 50))
            }

            // Scorecards & hole scores
            const scorecards: any[] = []
            const allHoleScores: any[] = []
            for (const c of contestants) {
              const scId = crypto.randomUUID()
              let totalGross = 0, totalPutts = 0
              for (const hole of eventHoles) {
                const hcp = c.hcp ?? 18
                const variance = hcp > 20 ? rand(-1, 3) : hcp > 10 ? rand(-1, 2) : rand(-2, 1)
                const strokes = Math.max(1, hole.par + variance)
                const putts = rand(1, 3)
                totalGross += strokes
                totalPutts += putts
                allHoleScores.push({
                  id: crypto.randomUUID(), scorecard_id: scId, hole_number: hole.hole_number,
                  strokes, putts, fairway_hit: hole.par > 3 ? Math.random() > 0.3 : null, gir: Math.random() > 0.4,
                })
              }
              scorecards.push({
                id: scId, round_id: roundId, player_id: c.player_id, course_id: event.course_id,
                gross_score: totalGross, net_score: totalGross - (c.hcp ?? 0), total_score: totalGross, total_putts: totalPutts,
              })
            }

            for (let i = 0; i < scorecards.length; i += 50) {
              await supabase.from('scorecards').insert(scorecards.slice(i, i + 50))
            }
            for (let i = 0; i < allHoleScores.length; i += 200) {
              const { error } = await supabase.from('hole_scores').insert(allHoleScores.slice(i, i + 200))
              if (error) console.error('hole_scores error:', error.message)
            }

            // EVENT RESULTS
            const eventWinCats = winCats.filter(wc => wc.tour_id === event.tour_id)
            const eventResults: any[] = []
            for (const cat of eventWinCats) {
              let catConts = [...contestants]
              if (cat.flight_id) catConts = contestants.filter(c => c.flight_id === cat.flight_id)
              if (!catConts.length) continue
              const sorted = catConts.map(c => {
                const sc = scorecards.find(s => s.player_id === c.player_id)
                return { ...c, gross: sc?.gross_score ?? 999, net: sc?.net_score ?? 999 }
              }).sort((a, b) => cat.calculation_type === 'gross' ? a.gross - b.gross : a.net - b.net)
              for (let r = 0; r < Math.min(cat.rank_count, sorted.length); r++) {
                eventResults.push({
                  id: crypto.randomUUID(), event_id: event.id, category_id: cat.id,
                  contestant_id: sorted[r].id, score_value: cat.calculation_type === 'gross' ? sorted[r].gross : sorted[r].net,
                  rank_position: r + 1,
                })
              }
            }
            if (eventResults.length) await supabase.from('event_results').insert(eventResults)

            // HANDICAP HISTORY
            const hcpHist = contestants.map(c => {
              const sc = scorecards.find(s => s.player_id === c.player_id)
              const oldHcp = c.hcp ?? 18
              const diff = (sc?.gross_score ?? 72) - (eCourse?.par ?? 72)
              let newHcp = oldHcp
              if (diff < -2) newHcp = Math.max(0, oldHcp - 1)
              else if (diff > 4) newHcp = Math.min(36, oldHcp + 1)
              return {
                id: crypto.randomUUID(), player_id: c.player_id, event_id: event.id,
                old_hcp: oldHcp, new_hcp: newHcp, gross_score: sc?.gross_score, net_score: sc?.net_score,
                sandbagging_flag: diff < -5,
              }
            })
            for (let i = 0; i < hcpHist.length; i += 50) {
              await supabase.from('handicap_history').insert(hcpHist.slice(i, i + 50))
            }
          }
        }

        console.log(`Event "${event.name}" seeded`)
      }

      return new Response(JSON.stringify({
        success: true, phase: 3, events: events.length,
        tours: 2, flights: flights.length, tour_players: tourPlayers.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (phase === 'cleanup') {
      console.log('Cleanup: Removing duplicate data...')
      const results: Record<string, number> = {}

      // Delete duplicate clubs (keep earliest by created_at)
      const { data: dupClubs } = await supabase.rpc('exec_sql', { sql: '' }) // can't use rpc
      
      // Get all clubs grouped by name, keep earliest
      const { data: allClubs } = await supabase.from('clubs').select('id, name, created_at').order('created_at')
      if (allClubs) {
        const seen = new Map<string, string>()
        const toDelete: string[] = []
        for (const c of allClubs) {
          if (seen.has(c.name)) {
            toDelete.push(c.id)
          } else {
            seen.set(c.name, c.id)
          }
        }
        if (toDelete.length > 0) {
          // Delete children first: club_staff, members, courses (and their holes/tees), tour_clubs, tickets
          for (const cid of toDelete) {
            await supabase.from('club_staff').delete().eq('club_id', cid)
            await supabase.from('members').delete().eq('club_id', cid)
            // courses linked to this club
            const { data: courses } = await supabase.from('courses').select('id').eq('club_id', cid)
            if (courses) {
              for (const course of courses) {
                await supabase.from('course_holes').delete().eq('course_id', course.id)
                await supabase.from('course_tees').delete().eq('course_id', course.id)
              }
              await supabase.from('courses').delete().eq('club_id', cid)
            }
            await supabase.from('tour_clubs').delete().eq('club_id', cid)
            await supabase.from('tour_players').delete().eq('club_id', cid)
          }
          // Now delete the duplicate clubs
          for (const cid of toDelete) {
            await supabase.from('clubs').delete().eq('id', cid)
          }
          results.clubs_deleted = toDelete.length
        }
      }

      // Delete duplicate tours (keep earliest)
      const { data: allTours } = await supabase.from('tours').select('id, name, created_at').order('created_at')
      if (allTours) {
        const seen = new Map<string, string>()
        const toDelete: string[] = []
        for (const t of allTours) {
          if (seen.has(t.name)) {
            toDelete.push(t.id)
          } else {
            seen.set(t.name, t.id)
          }
        }
        if (toDelete.length > 0) {
          for (const tid of toDelete) {
            // Delete events and their children
            const { data: events } = await supabase.from('events').select('id').eq('tour_id', tid)
            if (events) {
              for (const ev of events) {
                await supabase.from('hole_scores').delete().in('scorecard_id', 
                  (await supabase.from('scorecards').select('id').eq('round_id', 
                    (await supabase.from('rounds').select('id')).data?.map(r => r.id) ?? []
                  )).data?.map(s => s.id) ?? []
                )
                await supabase.from('event_results').delete().eq('event_id', ev.id)
                await supabase.from('event_checkins').delete().eq('event_id', ev.id)
                await supabase.from('caddy_assignments').delete().eq('event_id', ev.id)
                await supabase.from('golf_cart_assignments').delete().eq('event_id', ev.id)
                // pairings
                const { data: pairings } = await supabase.from('pairings').select('id').eq('event_id', ev.id)
                if (pairings) {
                  for (const p of pairings) {
                    await supabase.from('pairing_players').delete().eq('pairing_id', p.id)
                  }
                  await supabase.from('pairings').delete().eq('event_id', ev.id)
                }
                await supabase.from('tickets').delete().eq('event_id', ev.id)
                await supabase.from('contestants').delete().eq('event_id', ev.id)
                await supabase.from('handicap_history').delete().eq('event_id', ev.id)
              }
              await supabase.from('events').delete().eq('tour_id', tid)
            }
            await supabase.from('tournament_winner_categories').delete().eq('tour_id', tid)
            await supabase.from('tournament_flights').delete().eq('tour_id', tid)
            await supabase.from('tour_players').delete().eq('tour_id', tid)
            await supabase.from('tour_clubs').delete().eq('tour_id', tid)
            await supabase.from('tours').delete().eq('id', tid)
          }
          results.tours_deleted = toDelete.length
        }
      }

      // Delete duplicate events by name (keep earliest)
      const { data: allEvents } = await supabase.from('events').select('id, name, created_at').order('created_at')
      if (allEvents) {
        const seen = new Map<string, string>()
        const toDelete: string[] = []
        for (const e of allEvents) {
          if (seen.has(e.name)) {
            toDelete.push(e.id)
          } else {
            seen.set(e.name, e.id)
          }
        }
        if (toDelete.length > 0) {
          for (const eid of toDelete) {
            await supabase.from('event_results').delete().eq('event_id', eid)
            await supabase.from('event_checkins').delete().eq('event_id', eid)
            await supabase.from('caddy_assignments').delete().eq('event_id', eid)
            await supabase.from('golf_cart_assignments').delete().eq('event_id', eid)
            const { data: pairings } = await supabase.from('pairings').select('id').eq('event_id', eid)
            if (pairings) {
              for (const p of pairings) {
                await supabase.from('pairing_players').delete().eq('pairing_id', p.id)
              }
              await supabase.from('pairings').delete().eq('event_id', eid)
            }
            await supabase.from('tickets').delete().eq('event_id', eid)
            await supabase.from('contestants').delete().eq('event_id', eid)
            await supabase.from('handicap_history').delete().eq('event_id', eid)
            await supabase.from('events').delete().eq('id', eid)
          }
          results.events_deleted = toDelete.length
        }
      }

      // Delete duplicate members (same club_id + user_id, keep earliest)
      const { data: allMembers } = await supabase.from('members').select('id, club_id, user_id, joined_at').order('joined_at')
      if (allMembers) {
        const seen = new Set<string>()
        const toDelete: string[] = []
        for (const m of allMembers) {
          const key = `${m.club_id}-${m.user_id}`
          if (seen.has(key)) {
            toDelete.push(m.id)
          } else {
            seen.add(key)
          }
        }
        if (toDelete.length > 0) {
          for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100)
            await supabase.from('members').delete().in('id', batch)
          }
          results.members_deleted = toDelete.length
        }
      }

      // Delete duplicate club_staff
      const { data: allStaff } = await supabase.from('club_staff').select('id, club_id, user_id, staff_role, created_at').order('created_at')
      if (allStaff) {
        const seen = new Set<string>()
        const toDelete: string[] = []
        for (const s of allStaff) {
          const key = `${s.club_id}-${s.user_id}-${s.staff_role}`
          if (seen.has(key)) {
            toDelete.push(s.id)
          } else {
            seen.add(key)
          }
        }
        if (toDelete.length > 0) {
          for (let i = 0; i < toDelete.length; i += 100) {
            await supabase.from('club_staff').delete().in('id', toDelete.slice(i, i + 100))
          }
          results.staff_deleted = toDelete.length
        }
      }

      // Delete duplicate tour_players
      const { data: allTP } = await supabase.from('tour_players').select('id, tour_id, player_id, created_at').order('created_at')
      if (allTP) {
        const seen = new Set<string>()
        const toDelete: string[] = []
        for (const tp of allTP) {
          const key = `${tp.tour_id}-${tp.player_id}`
          if (seen.has(key)) {
            toDelete.push(tp.id)
          } else {
            seen.add(key)
          }
        }
        if (toDelete.length > 0) {
          for (let i = 0; i < toDelete.length; i += 100) {
            await supabase.from('tour_players').delete().in('id', toDelete.slice(i, i + 100))
          }
          results.tour_players_deleted = toDelete.length
        }
      }

      // Delete duplicate contestants
      const { data: allContestants } = await supabase.from('contestants').select('id, event_id, player_id, created_at').order('created_at')
      if (allContestants) {
        const seen = new Set<string>()
        const toDelete: string[] = []
        for (const c of allContestants) {
          const key = `${c.event_id}-${c.player_id}`
          if (seen.has(key)) {
            toDelete.push(c.id)
          } else {
            seen.add(key)
          }
        }
        if (toDelete.length > 0) {
          for (let i = 0; i < toDelete.length; i += 100) {
            await supabase.from('contestants').delete().in('id', toDelete.slice(i, i + 100))
          }
          results.contestants_deleted = toDelete.length
        }
      }

      // Delete duplicate profiles (keep earliest by created_at)
      const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, created_at').order('created_at')
      // Profiles are unique by id (PK), so no name-based dedup needed

      // Get final counts
      const counts: Record<string, number> = {}
      for (const tbl of ['clubs','courses','members','club_staff','tours','events','contestants','tour_players']) {
        const { count } = await supabase.from(tbl).select('*', { count: 'exact', head: true })
        counts[tbl] = count ?? 0
      }

      return new Response(JSON.stringify({ success: true, phase: 'cleanup', deleted: results, remaining: counts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (phase === '4') {
      // ============ PHASE 4: Social, Booking & Range Data ============
      console.log('Phase 4: Buddy connections, chats, tee times, range data, system admins...')

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, handicap').order('created_at').limit(200)
      const { data: allClubs } = await supabase.from('clubs').select('id, name, is_personal, owner_id').eq('is_personal', false)
      const { data: allCourses } = await supabase.from('courses').select('id, club_id, green_fee_price, holes_count').eq('holes_count', 18)

      if (!profiles?.length || !allClubs?.length) throw new Error('Run phases 1-3 first.')

      const results: Record<string, number> = {}

      // --- UPDATE CLUBS with facility_type ---
      const golfClubs = allClubs.filter((_, i) => i < 20)
      const rangeClubs = allClubs.filter((_, i) => i >= 20 && i < 26)
      const academyClubs = allClubs.filter((_, i) => i >= 26 && i < 28)
      const studioClubs = allClubs.filter((_, i) => i >= 28)

      for (const c of golfClubs) await supabase.from('clubs').update({ facility_type: 'golf_club', is_verified: true }).eq('id', c.id)
      for (const c of rangeClubs) await supabase.from('clubs').update({ facility_type: 'driving_range', is_verified: true }).eq('id', c.id)
      for (const c of academyClubs) await supabase.from('clubs').update({ facility_type: 'golf_academy', is_verified: true }).eq('id', c.id)
      for (const c of studioClubs) await supabase.from('clubs').update({ facility_type: 'golf_studio', is_verified: true }).eq('id', c.id)
      console.log('Club facility_type updated')

      // --- SYSTEM ADMINS ---
      const admins = [
        { user_id: profiles[0].id, admin_level: 'super_admin', granted_by: profiles[0].id, is_active: true, notes: 'Platform founder and super administrator' },
        { user_id: profiles[1].id, admin_level: 'moderator', granted_by: profiles[0].id, is_active: true, notes: 'Moderates clubs and user content' },
        { user_id: profiles[5].id, admin_level: 'support', granted_by: profiles[0].id, is_active: true, notes: 'User support and troubleshooting' },
      ]
      const { error: admErr } = await supabase.from('system_admins').upsert(admins, { onConflict: 'user_id' })
      if (admErr) console.error('system_admins error:', admErr.message)
      else results.system_admins = 3
      console.log('System admins created')

      // --- BUDDY CONNECTIONS ---
      const buddyPairs: any[] = []
      const buddySet = new Set<string>()
      for (let i = 0; i < Math.min(60, profiles.length); i++) {
        const numBuddies = rand(1, 4)
        for (let b = 0; b < numBuddies; b++) {
          const j = rand(0, Math.min(80, profiles.length - 1))
          if (i === j) continue
          const key1 = `${profiles[i].id}-${profiles[j].id}`
          const key2 = `${profiles[j].id}-${profiles[i].id}`
          if (buddySet.has(key1) || buddySet.has(key2)) continue
          buddySet.add(key1)
          buddyPairs.push({
            id: crypto.randomUUID(),
            requester_id: profiles[i].id,
            addressee_id: profiles[j].id,
            status: Math.random() > 0.15 ? 'accepted' : 'pending',
          })
        }
      }
      for (let i = 0; i < buddyPairs.length; i += 50) {
        const { error } = await supabase.from('buddy_connections').insert(buddyPairs.slice(i, i + 50))
        if (error) console.error('buddy error:', error.message)
      }
      results.buddy_connections = buddyPairs.length
      console.log(`${buddyPairs.length} buddy connections created`)

      // --- CONVERSATIONS & CHAT MESSAGES ---
      const convos: any[] = []
      const participants: any[] = []
      const messages: any[] = []
      const chatTopics = [
        ['Sudah lihat jadwal pairing untuk event bulan ini?', 'Sudah! Kita satu group. Tee off jam 7:20.', 'Oke. Praktek dulu di range besok pagi?', 'Siap! Jam 7 ya di driving range.'],
        ['Handicap kamu udah turun banyak. Rajin latihan?', 'Haha iya, setiap minggu di range. Coach baru bagus banget.', 'Siapa coachnya? Mau coba juga.', 'Pro di club. Booking lewat app, gampang.'],
        ['Bro, tee time besok masih kosong?', 'Masih! Jam 9:30 ada slot. Mau bareng?', 'Gas! Ajak teman juga dong.', 'Oke, udah di-invite. Booking untuk 3 orang ya.'],
        ['Selamat ya bro, net score 67!', 'Makasih! Putt di hole 17 emang lagi bagus.', 'GG! Leaderboard update real-time sekarang, keren banget.', 'Yep, input skor per hole langsung keliatan.'],
        ['Bay simulator lagi available ga hari ini?', 'Bay 11 dan 12 kosong dari jam 3. Rate 150k/jam.', 'Oke booking jam 3 ya. Payment lewat app?', 'Bisa! Atau bayar di tempat juga fine.'],
        ['Turnamen bulan depan siap?', 'Siap dong! Udah daftar flight A.', 'Keren, kita ketemu di sana ya.', 'See you on the course! 🏌️'],
        ['Driving range baru buka di Tangerang, udah coba?', 'Belum! Bay-nya bagus ya?', 'Premium semua, ada simulator juga.', 'Wah harus coba, booking dulu ah.'],
        ['Score di event kemarin gimana?', 'Gross 78, lumayan lah.', 'Mantap! Net berapa?', 'Net 70, alhamdulillah masuk top 5.'],
        ['Caddy kemarin service-nya bagus banget', 'Iya, dia udah pengalaman bertahun-tahun.', 'Request caddy yang sama bisa ga ya?', 'Bisa, lewat app tinggal pilih.'],
        ['Green fee weekend naik ga?', 'Naik dikit, 50rb dari harga weekday.', 'Masih worth it sih, course-nya bagus.', 'Setuju, maintenance-nya juga top.'],
      ]

      for (let c = 0; c < 10; c++) {
        const convId = crypto.randomUUID()
        const p1 = profiles[c * 2]
        const p2 = profiles[c * 2 + 1]
        const daysAgo = 10 - c

        convos.push({ id: convId, created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(), updated_at: new Date(Date.now() - c * 3600000).toISOString() })
        participants.push(
          { id: crypto.randomUUID(), conversation_id: convId, user_id: p1.id, joined_at: new Date(Date.now() - daysAgo * 86400000).toISOString() },
          { id: crypto.randomUUID(), conversation_id: convId, user_id: p2.id, joined_at: new Date(Date.now() - daysAgo * 86400000).toISOString() },
        )

        const topic = chatTopics[c % chatTopics.length]
        for (let m = 0; m < topic.length; m++) {
          messages.push({
            id: crypto.randomUUID(), conversation_id: convId,
            sender_id: m % 2 === 0 ? p1.id : p2.id,
            content: topic[m],
            created_at: new Date(Date.now() - (daysAgo * 86400000) + m * 3600000).toISOString(),
          })
        }
      }

      await supabase.from('conversations').insert(convos)
      await supabase.from('conversation_participants').insert(participants)
      await supabase.from('chat_messages').insert(messages)
      results.conversations = convos.length
      results.chat_messages = messages.length
      console.log(`${convos.length} conversations, ${messages.length} messages created`)

      // --- TEE TIME BOOKINGS ---
      if (allCourses?.length) {
        const teeTimeSlots = ['07:00','07:10','07:20','07:30','07:40','07:50','08:00','08:10','08:20','08:30','09:00','09:30','10:00','10:30','13:00','13:30','14:00','14:30']
        const bookings: any[] = []
        for (let i = 0; i < Math.min(30, profiles.length); i++) {
          // 4 past bookings
          for (let j = 0; j < 4; j++) {
            const course = allCourses[(i + j) % allCourses.length]
            const daysAgo = (i * 2 + j * 3) % 30 + 3
            const bookDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0]
            const playersCount = 1 + (i + j) % 4
            const fee = (course.green_fee_price || 600000) * playersCount

            bookings.push({
              id: crypto.randomUUID(), course_id: course.id, user_id: profiles[i].id,
              booking_date: bookDate, tee_time: teeTimeSlots[(i + j) % teeTimeSlots.length],
              players_count: playersCount, total_price: fee, status: 'completed',
              notes: `Regular booking - ${playersCount} players`,
            })
          }
          // 2 future bookings
          for (let j = 0; j < 2; j++) {
            const course = allCourses[(i + j + 1) % allCourses.length]
            const daysAhead = j * 3 + (i % 7) + 1
            const bookDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]
            const playersCount = 2 + j % 3
            const fee = (course.green_fee_price || 600000) * playersCount

            bookings.push({
              id: crypto.randomUUID(), course_id: course.id, user_id: profiles[i].id,
              booking_date: bookDate, tee_time: teeTimeSlots[(i * 2 + j) % teeTimeSlots.length],
              players_count: playersCount, total_price: fee, status: 'confirmed',
            })
          }
        }

        for (let i = 0; i < bookings.length; i += 50) {
          const { error } = await supabase.from('tee_time_bookings').insert(bookings.slice(i, i + 50))
          if (error) console.error('tee_time_bookings error:', error.message)
        }
        results.tee_time_bookings = bookings.length
        console.log(`${bookings.length} tee time bookings created`)
      }

      // --- RANGE BAYS ---
      const nonGolfClubs = [...rangeClubs, ...academyClubs, ...studioClubs]
      const bayTypes = ['premium','premium','premium','premium','standard','standard','standard','standard','covered','covered','simulator','simulator']
      const bayPrices = [80000,80000,80000,80000,50000,50000,50000,50000,65000,65000,150000,150000]
      const allBays: any[] = []

      for (const club of nonGolfClubs) {
        for (let b = 1; b <= 12; b++) {
          allBays.push({
            id: crypto.randomUUID(), club_id: club.id, bay_number: b,
            bay_type: bayTypes[b - 1], price_per_hour: bayPrices[b - 1], is_active: true,
          })
        }
      }
      if (allBays.length) {
        for (let i = 0; i < allBays.length; i += 50) {
          const { error } = await supabase.from('range_bays').insert(allBays.slice(i, i + 50))
          if (error) console.error('range_bays error:', error.message)
        }
        results.range_bays = allBays.length
        console.log(`${allBays.length} range bays created`)
      }

      // --- RANGE BOOKINGS ---
      if (allBays.length > 0) {
        const rangeBookings: any[] = []
        for (let i = 0; i < Math.min(20, profiles.length); i++) {
          for (let j = 0; j < 4; j++) {
            const bay = allBays[(i * 4 + j) % allBays.length]
            const daysAgo = (j * 5 + i) % 28
            const bookDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0]
            const startHour = 7 + (i + j) % 11
            const duration = j % 3 === 0 ? 2 : 1
            const startTime = `${String(startHour).padStart(2, '0')}:${j % 2 === 0 ? '00' : '30'}:00`
            const endHour = startHour + duration
            const endTime = `${String(endHour).padStart(2, '0')}:${j % 2 === 0 ? '00' : '30'}:00`

            rangeBookings.push({
              id: crypto.randomUUID(), club_id: bay.club_id, bay_id: bay.id,
              user_id: profiles[i].id, booking_date: bookDate,
              start_time: startTime, end_time: endTime,
              duration_hours: duration, total_price: bay.price_per_hour * duration,
              status: daysAgo > 1 ? 'completed' : 'confirmed',
              balls_bucket_count: duration * 2,
            })
          }
        }
        for (let i = 0; i < rangeBookings.length; i += 50) {
          const { error } = await supabase.from('range_bookings').insert(rangeBookings.slice(i, i + 50))
          if (error) console.error('range_bookings error:', error.message)
        }
        results.range_bookings = rangeBookings.length
        console.log(`${rangeBookings.length} range bookings created`)
      }

      // --- RANGE LESSONS ---
      const { data: instructors } = await supabase.from('club_staff').select('user_id, club_id').eq('staff_role', 'pro').limit(10)
      if (instructors?.length) {
        const lessons: any[] = []
        const lessonTypes = ['individual', 'group', 'video_analysis', 'individual']
        for (let i = 0; i < Math.min(12, profiles.length); i++) {
          for (let j = 0; j < 3; j++) {
            const inst = instructors[(i + j) % instructors.length]
            const daysAgo = (i * j + j) % 25
            const lessonDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0]
            lessons.push({
              id: crypto.randomUUID(), club_id: inst.club_id,
              instructor_id: inst.user_id, student_id: profiles[i + 10].id,
              lesson_date: lessonDate, start_time: `${String(8 + (i + j) % 4).padStart(2, '0')}:00:00`,
              duration_minutes: 60, lesson_type: lessonTypes[(i + j) % 4],
              price: 300000, status: daysAgo > 0 ? 'completed' : 'scheduled',
            })
          }
        }
        for (let i = 0; i < lessons.length; i += 50) {
          const { error } = await supabase.from('range_lessons').insert(lessons.slice(i, i + 50))
          if (error) console.error('range_lessons error:', error.message)
        }
        results.range_lessons = lessons.length
        console.log(`${lessons.length} range lessons created`)
      }

      // --- CLUB INVITATIONS ---
      const invitations: any[] = []
      const invStatuses = ['pending', 'pending', 'accepted', 'pending', 'declined', 'pending', 'accepted', 'pending', 'pending', 'accepted', 'pending', 'pending']
      for (let i = 0; i < 12; i++) {
        const club = golfClubs[i % golfClubs.length]
        invitations.push({
          id: crypto.randomUUID(),
          club_id: club.id,
          invited_by: club.owner_id,
          invited_user_id: profiles[80 + i]?.id ?? profiles[i + 40].id,
          status: invStatuses[i],
        })
      }
      const { error: invErr } = await supabase.from('club_invitations').insert(invitations)
      if (invErr) console.error('club_invitations error:', invErr.message)
      else results.club_invitations = invitations.length
      console.log('Club invitations created')

      // --- AUDIT LOG ---
      const auditLogs = [
        { actor_id: profiles[0].id, actor_role: 'super_admin', action: 'VERIFY_CLUB', target_table: 'clubs', target_id: golfClubs[0]?.id, new_values: { is_verified: true } },
        { actor_id: profiles[0].id, actor_role: 'super_admin', action: 'CREATE_TOUR', target_table: 'tours', new_values: { name: 'Championship Series', type: 'interclub' } },
        { actor_id: profiles[1].id, actor_role: 'moderator', action: 'APPROVE_MEMBER', target_table: 'members', new_values: { role: 'member' } },
        { actor_id: profiles[5].id, actor_role: 'support', action: 'RESOLVE_TICKET', target_table: 'profiles', new_values: { issue: 'handicap_correction' } },
        { actor_id: profiles[2].id, actor_role: 'owner', action: 'CREATE_EVENT', target_table: 'events', new_values: { name: 'Monthly Tournament', status: 'published' } },
      ]
      const { error: auditErr } = await supabase.from('audit_log').insert(auditLogs)
      if (auditErr) console.error('audit_log error:', auditErr.message)
      else results.audit_log = auditLogs.length
      console.log('Audit logs created')

      // --- UPDATE COURSES with course_type and ratings ---
      if (allCourses?.length) {
        for (let i = 0; i < allCourses.length; i++) {
          const types = ['championship', 'championship', 'resort', 'championship', 'championship', 'resort', 'championship', 'resort', 'executive', 'championship']
          await supabase.from('courses').update({
            course_type: types[i % types.length],
            slope_rating: +(113 + Math.random() * 25).toFixed(1),
            course_rating: +(69 + Math.random() * 6).toFixed(1),
          }).eq('id', allCourses[i].id)
        }
        console.log('Course ratings updated')
      }

      return new Response(JSON.stringify({ success: true, phase: 4, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid phase. Use ?phase=1, ?phase=2, ?phase=3, ?phase=4, or ?phase=cleanup' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
