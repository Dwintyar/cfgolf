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

    return new Response(JSON.stringify({ error: 'Invalid phase. Use ?phase=1, ?phase=2, or ?phase=3' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
