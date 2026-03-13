import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: generate UUID
const uuid = () => crypto.randomUUID()

// Indonesian first/last names for realistic data
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

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)] }
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ============ 1. PROFILES (500 users) ============
    console.log('Seeding 500 profiles...')
    const profiles: any[] = []
    for (let i = 0; i < 500; i++) {
      profiles.push({
        id: uuid(),
        full_name: `${pick(firstNames)} ${pick(lastNames)}`,
        handicap: rand(0, 36),
        location: pick(locations),
        bio: `Golfer sejak ${rand(2005, 2023)}. Passionate about the game.`,
        avatar_url: null,
      })
    }
    // Insert in batches of 100
    for (let i = 0; i < profiles.length; i += 100) {
      const batch = profiles.slice(i, i + 100)
      const { error } = await supabase.from('profiles').upsert(batch, { onConflict: 'id' })
      if (error) console.error('profiles batch error:', error.message)
    }
    console.log('Profiles done')

    // ============ 2. CLUBS (30: 20 golf courses, 10 driving ranges) ============
    console.log('Seeding 30 clubs...')
    const clubs: any[] = []
    for (let i = 0; i < 20; i++) {
      clubs.push({
        id: uuid(),
        name: `${clubPrefixes[i % clubPrefixes.length]} ${clubSuffixes[i % clubSuffixes.length]}`,
        description: `Premier golf destination in ${pick(locations)}`,
        owner_id: profiles[i].id,
        is_personal: false,
      })
    }
    for (let i = 0; i < 10; i++) {
      clubs.push({
        id: uuid(),
        name: `${rangePrefixes[i]} ${rangeSuffixes[i % rangeSuffixes.length]}`,
        description: `Top driving range and practice facility in ${pick(locations)}`,
        owner_id: profiles[20 + i].id,
        is_personal: false,
      })
    }
    const { error: clubErr } = await supabase.from('clubs').insert(clubs)
    if (clubErr) console.error('clubs error:', clubErr.message)

    // ============ 3. COURSES & HOLES (for 20 golf course clubs) ============
    console.log('Seeding courses and holes...')
    const courses: any[] = []
    const courseHoles: any[] = []
    const courseTees: any[] = []
    
    for (let i = 0; i < 20; i++) {
      const courseId = uuid()
      const par = rand(70, 72)
      courses.push({
        id: courseId,
        club_id: clubs[i].id,
        name: courseNames18[i],
        location: pick(locations),
        description: `Beautiful 18-hole ${courseNames18[i]} at ${clubs[i].name}`,
        holes_count: 18,
        par,
        green_fee_price: rand(500, 3000) * 1000,
      })
      
      // 18 holes
      const parDistribution = [4,4,4,4,4,4,4,4,4,4,3,3,3,3,5,5,5,5] // typical par distribution
      const shuffledPars = shuffle(parDistribution)
      for (let h = 1; h <= 18; h++) {
        courseHoles.push({
          id: uuid(),
          course_id: courseId,
          hole_number: h,
          par: shuffledPars[h - 1],
          distance_yards: shuffledPars[h - 1] === 3 ? rand(130, 220) : shuffledPars[h - 1] === 4 ? rand(320, 450) : rand(480, 580),
          handicap_index: h,
        })
      }

      // Tees
      const teeColors = [
        { tee_name: 'Black', color: '#000000', rating: 73 + Math.random() * 2, slope: rand(130, 145) },
        { tee_name: 'Blue', color: '#0000FF', rating: 71 + Math.random() * 2, slope: rand(125, 138) },
        { tee_name: 'White', color: '#FFFFFF', rating: 69 + Math.random() * 2, slope: rand(118, 132) },
        { tee_name: 'Red', color: '#FF0000', rating: 67 + Math.random() * 2, slope: rand(112, 126) },
      ]
      for (const t of teeColors) {
        courseTees.push({ id: uuid(), course_id: courseId, ...t })
      }
    }

    // Also add driving range "courses" (9-hole short courses or practice bays)
    for (let i = 0; i < 10; i++) {
      const courseId = uuid()
      courses.push({
        id: courseId,
        club_id: clubs[20 + i].id,
        name: `${clubs[20 + i].name} Practice Bay`,
        location: pick(locations),
        description: 'Driving range with practice bays',
        holes_count: 9,
        par: 27,
        green_fee_price: rand(50, 200) * 1000,
      })
      for (let h = 1; h <= 9; h++) {
        courseHoles.push({
          id: uuid(),
          course_id: courseId,
          hole_number: h,
          par: 3,
          distance_yards: rand(80, 250),
          handicap_index: h,
        })
      }
    }

    for (let i = 0; i < courses.length; i += 50) {
      const { error } = await supabase.from('courses').insert(courses.slice(i, i + 50))
      if (error) console.error('courses error:', error.message)
    }
    for (let i = 0; i < courseHoles.length; i += 100) {
      const { error } = await supabase.from('course_holes').insert(courseHoles.slice(i, i + 100))
      if (error) console.error('course_holes error:', error.message)
    }
    if (courseTees.length > 0) {
      const { error } = await supabase.from('course_tees').insert(courseTees)
      if (error) console.error('course_tees error:', error.message)
    }
    console.log('Courses done')

    // ============ 4. MEMBERS (distribute 500 users across clubs) ============
    console.log('Seeding members...')
    const members: any[] = []
    const memberSet = new Set<string>()
    
    // Club owners are already members
    for (let i = 0; i < 30; i++) {
      const key = `${clubs[i].id}-${profiles[i].id}`
      members.push({ id: uuid(), club_id: clubs[i].id, user_id: profiles[i].id, role: 'owner' })
      memberSet.add(key)
    }
    
    // Distribute remaining users (each joins 1-3 clubs)
    for (let i = 30; i < 500; i++) {
      const numClubs = rand(1, 3)
      const selectedClubs = shuffle(clubs.slice(0, 20)).slice(0, numClubs) // prefer golf course clubs
      for (const c of selectedClubs) {
        const key = `${c.id}-${profiles[i].id}`
        if (!memberSet.has(key)) {
          members.push({ id: uuid(), club_id: c.id, user_id: profiles[i].id, role: 'member' })
          memberSet.add(key)
        }
      }
    }
    // Add some admins
    for (let i = 0; i < 20; i++) {
      const adminIdx = 30 + i * 2
      if (adminIdx < 500) {
        const key = `${clubs[i].id}-${profiles[adminIdx].id}`
        if (!memberSet.has(key)) {
          members.push({ id: uuid(), club_id: clubs[i].id, user_id: profiles[adminIdx].id, role: 'admin' })
          memberSet.add(key)
        }
      }
    }

    for (let i = 0; i < members.length; i += 100) {
      const { error } = await supabase.from('members').insert(members.slice(i, i + 100))
      if (error) console.error('members batch error:', error.message)
    }
    console.log('Members done')

    // ============ 5. CLUB STAFF (caddies, marshals, starters) ============
    console.log('Seeding club staff...')
    const staffRecords: any[] = []
    const staffRoles = ['caddy', 'caddy', 'caddy', 'caddy', 'caddy', 'marshal', 'starter', 'pro', 'staff', 'staff']
    
    // For each golf course club, assign 8-12 staff from members
    for (let i = 0; i < 20; i++) {
      const clubMembers = members.filter(m => m.club_id === clubs[i].id && m.role === 'member')
      const staffCount = Math.min(rand(8, 12), clubMembers.length)
      const staffMembers = shuffle(clubMembers).slice(0, staffCount)
      const usedRoles = new Set<string>()
      for (let s = 0; s < staffMembers.length; s++) {
        const role = staffRoles[s % staffRoles.length]
        const key = `${clubs[i].id}-${staffMembers[s].user_id}-${role}`
        if (!usedRoles.has(key)) {
          staffRecords.push({
            id: uuid(),
            club_id: clubs[i].id,
            user_id: staffMembers[s].user_id,
            staff_role: role,
            status: 'active',
          })
          usedRoles.add(key)
        }
      }
    }

    for (let i = 0; i < staffRecords.length; i += 100) {
      const { error } = await supabase.from('club_staff').insert(staffRecords.slice(i, i + 100))
      if (error) console.error('staff error:', error.message)
    }
    console.log('Staff done')

    // ============ 6. TOURS (2 annual tournaments) ============
    console.log('Seeding tours...')
    const tour1Id = uuid()
    const tour2Id = uuid()
    const tours = [
      {
        id: tour1Id,
        name: 'CFGolf Championship Series 2025',
        organizer_club_id: clubs[0].id,
        tournament_type: 'internal',
        year: 2025,
        description: 'Annual internal championship series with monthly events throughout the year.',
      },
      {
        id: tour2Id,
        name: 'CFGolf Interclub Cup 2025',
        organizer_club_id: clubs[1].id,
        tournament_type: 'interclub',
        year: 2025,
        description: 'Prestigious interclub competition bringing together the best golfers from multiple clubs.',
      },
    ]
    const { error: tourErr } = await supabase.from('tours').insert(tours)
    if (tourErr) console.error('tours error:', tourErr.message)

    // ============ 7. TOUR CLUBS (6 clubs per tour) ============
    console.log('Seeding tour clubs...')
    const tourClubs: any[] = []
    // Tour 1: clubs 0-5
    for (let i = 0; i < 6; i++) {
      tourClubs.push({
        id: uuid(),
        tour_id: tour1Id,
        club_id: clubs[i].id,
        status: 'accepted',
        ticket_quota: rand(6, 12),
      })
    }
    // Tour 2: clubs 2-7
    for (let i = 2; i < 8; i++) {
      tourClubs.push({
        id: uuid(),
        tour_id: tour2Id,
        club_id: clubs[i].id,
        status: 'accepted',
        ticket_quota: rand(6, 12),
      })
    }
    const { error: tcErr } = await supabase.from('tour_clubs').insert(tourClubs)
    if (tcErr) console.error('tour_clubs error:', tcErr.message)

    // ============ 8. TOURNAMENT FLIGHTS ============
    console.log('Seeding flights...')
    const flights: any[] = []
    for (const tourId of [tour1Id, tour2Id]) {
      flights.push(
        { id: uuid(), tour_id: tourId, flight_name: 'Flight A', hcp_min: 0, hcp_max: 12, display_order: 1 },
        { id: uuid(), tour_id: tourId, flight_name: 'Flight B', hcp_min: 13, hcp_max: 24, display_order: 2 },
        { id: uuid(), tour_id: tourId, flight_name: 'Flight C', hcp_min: 25, hcp_max: 36, display_order: 3 },
      )
    }
    const { error: fErr } = await supabase.from('tournament_flights').insert(flights)
    if (fErr) console.error('flights error:', fErr.message)

    // ============ 9. WINNER CATEGORIES ============
    console.log('Seeding winner categories...')
    const winCats: any[] = []
    for (const tourId of [tour1Id, tour2Id]) {
      const tourFlights = flights.filter(f => f.tour_id === tourId)
      let order = 1
      // Overall categories
      winCats.push(
        { id: uuid(), tour_id: tourId, category_name: 'Overall Best Gross', calculation_type: 'gross', rank_count: 3, display_order: order++, flight_id: null },
        { id: uuid(), tour_id: tourId, category_name: 'Overall Best Net', calculation_type: 'net', rank_count: 3, display_order: order++, flight_id: null },
      )
      // Per-flight categories
      for (const f of tourFlights) {
        winCats.push(
          { id: uuid(), tour_id: tourId, category_name: `${f.flight_name} Best Gross`, calculation_type: 'gross', rank_count: 3, display_order: order++, flight_id: f.id },
          { id: uuid(), tour_id: tourId, category_name: `${f.flight_name} Best Net`, calculation_type: 'net', rank_count: 3, display_order: order++, flight_id: f.id },
        )
      }
    }
    const { error: wcErr } = await supabase.from('tournament_winner_categories').insert(winCats)
    if (wcErr) console.error('winner_categories error:', wcErr.message)

    // ============ 10. TOUR PLAYERS (register players from participating clubs) ============
    console.log('Seeding tour players...')
    const tourPlayers: any[] = []
    const tour1Clubs = tourClubs.filter(tc => tc.tour_id === tour1Id)
    const tour2Clubs = tourClubs.filter(tc => tc.tour_id === tour2Id)

    const registerPlayersForTour = (tourId: string, tClubs: any[]) => {
      const registered = new Set<string>()
      for (const tc of tClubs) {
        const clubMems = members.filter(m => m.club_id === tc.club_id)
        const count = Math.min(rand(15, 30), clubMems.length)
        const selected = shuffle(clubMems).slice(0, count)
        for (const m of selected) {
          if (!registered.has(m.user_id)) {
            tourPlayers.push({
              id: uuid(),
              tour_id: tourId,
              club_id: tc.club_id,
              player_id: m.user_id,
              status: 'active',
            })
            registered.add(m.user_id)
          }
        }
      }
    }
    registerPlayersForTour(tour1Id, tour1Clubs)
    registerPlayersForTour(tour2Id, tour2Clubs)

    for (let i = 0; i < tourPlayers.length; i += 100) {
      const { error } = await supabase.from('tour_players').insert(tourPlayers.slice(i, i + 100))
      if (error) console.error('tour_players error:', error.message)
    }
    console.log('Tour players done')

    // ============ 11. EVENTS (12 per tour = 24 total) ============
    console.log('Seeding events...')
    const events: any[] = []
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const golfCourses = courses.filter(c => c.holes_count === 18)

    for (let m = 0; m < 12; m++) {
      const day = rand(10, 25)
      // Tour 1 event
      events.push({
        id: uuid(),
        tour_id: tour1Id,
        name: `Championship Series Leg ${m + 1}`,
        event_date: `2025-${months[m]}-${String(day).padStart(2, '0')}`,
        course_id: golfCourses[m % golfCourses.length].id,
        status: m < 6 ? 'completed' : m === 6 ? 'active' : 'draft',
        ticket_total: rand(40, 60),
      })
      // Tour 2 event
      events.push({
        id: uuid(),
        tour_id: tour2Id,
        name: `Interclub Cup Round ${m + 1}`,
        event_date: `2025-${months[m]}-${String(day + 1).padStart(2, '0')}`,
        course_id: golfCourses[(m + 5) % golfCourses.length].id,
        status: m < 6 ? 'completed' : m === 6 ? 'active' : 'draft',
        ticket_total: rand(40, 60),
      })
    }

    const { error: evErr } = await supabase.from('events').insert(events)
    if (evErr) console.error('events error:', evErr.message)
    console.log('Events done')

    // ============ 12. PER-EVENT DATA: tickets, contestants, checkins, pairings, scores ============
    console.log('Seeding per-event data...')
    
    for (const event of events) {
      const tourId = event.tour_id
      const tPlayers = tourPlayers.filter(tp => tp.tour_id === tourId)
      const eventTourClubs = tourClubs.filter(tc => tc.tour_id === tourId)
      const tourFlights = flights.filter(f => f.tour_id === tourId)
      const eventCourse = courses.find(c => c.id === event.course_id)
      const eventHoles = courseHoles.filter(h => h.course_id === event.course_id)

      // Select contestants for this event (30-50 players)
      const numContestants = Math.min(rand(30, 50), tPlayers.length)
      const selectedPlayers = shuffle(tPlayers).slice(0, numContestants)

      // --- TICKETS ---
      const tickets: any[] = []
      let ticketNum = 1
      for (const tc of eventTourClubs) {
        const clubPlayers = selectedPlayers.filter(sp => sp.club_id === tc.club_id)
        for (const cp of clubPlayers) {
          tickets.push({
            id: uuid(),
            event_id: event.id,
            club_id: tc.club_id,
            ticket_number: ticketNum++,
            status: 'assigned',
            assigned_player_id: cp.player_id,
          })
        }
      }
      // Also add some unassigned club tickets
      for (const tc of eventTourClubs) {
        for (let t = 0; t < rand(1, 3); t++) {
          tickets.push({
            id: uuid(),
            event_id: event.id,
            club_id: tc.club_id,
            ticket_number: ticketNum++,
            status: 'available',
            assigned_player_id: null,
          })
        }
      }

      if (tickets.length > 0) {
        const { error } = await supabase.from('tickets').insert(tickets)
        if (error) console.error(`tickets error (${event.name}):`, error.message)
      }

      // --- CONTESTANTS ---
      const contestants: any[] = []
      for (const sp of selectedPlayers) {
        const profile = profiles.find(p => p.id === sp.player_id)
        const hcp = profile?.handicap ?? rand(0, 36)
        // Assign flight based on HCP
        let flightId: string | null = null
        for (const f of tourFlights) {
          if (hcp >= f.hcp_min && hcp <= f.hcp_max) { flightId = f.id; break }
        }
        const ticket = tickets.find(t => t.assigned_player_id === sp.player_id)
        contestants.push({
          id: uuid(),
          event_id: event.id,
          player_id: sp.player_id,
          hcp,
          flight_id: flightId,
          ticket_id: ticket?.id ?? null,
          status: 'competitor',
        })
      }

      if (contestants.length > 0) {
        const { error } = await supabase.from('contestants').insert(contestants)
        if (error) console.error(`contestants error (${event.name}):`, error.message)
      }

      // --- CHECK-INS (for completed/active events) ---
      if (event.status !== 'draft') {
        const checkins: any[] = []
        for (let ci = 0; ci < contestants.length; ci++) {
          checkins.push({
            id: uuid(),
            event_id: event.id,
            contestant_id: contestants[ci].id,
            bag_drop_number: ci + 1,
            locker_number: ci + 1,
            notes: null,
          })
        }
        if (checkins.length > 0) {
          const { error } = await supabase.from('event_checkins').insert(checkins)
          if (error) console.error(`checkins error (${event.name}):`, error.message)
        }

        // --- GOLF CART ASSIGNMENTS (pairs share carts) ---
        const cartAssignments: any[] = []
        for (let ci = 0; ci < contestants.length; ci++) {
          cartAssignments.push({
            id: uuid(),
            event_id: event.id,
            contestant_id: contestants[ci].id,
            cart_number: Math.floor(ci / 2) + 1,
          })
        }
        if (cartAssignments.length > 0) {
          const { error } = await supabase.from('golf_cart_assignments').insert(cartAssignments)
          if (error) console.error(`carts error (${event.name}):`, error.message)
        }

        // --- CADDY ASSIGNMENTS (60% get caddies) ---
        const caddyStaff = staffRecords.filter(s => s.staff_role === 'caddy')
        const caddyAssignments: any[] = []
        const caddyContestants = shuffle(contestants).slice(0, Math.floor(contestants.length * 0.6))
        for (let ci = 0; ci < caddyContestants.length; ci++) {
          if (caddyStaff.length > 0) {
            caddyAssignments.push({
              id: uuid(),
              event_id: event.id,
              contestant_id: caddyContestants[ci].id,
              caddy_id: caddyStaff[ci % caddyStaff.length].user_id,
            })
          }
        }
        if (caddyAssignments.length > 0) {
          const { error } = await supabase.from('caddy_assignments').insert(caddyAssignments)
          if (error) console.error(`caddy error (${event.name}):`, error.message)
        }

        // --- PAIRINGS (groups of 4) ---
        const pairings: any[] = []
        const pairingPlayers: any[] = []
        const shuffledContestants = shuffle(contestants)
        const groupSize = 4
        const numGroups = Math.ceil(shuffledContestants.length / groupSize)

        for (let g = 0; g < numGroups; g++) {
          const pairingId = uuid()
          const hour = 7 + Math.floor(g / 4)
          const minute = (g % 4) * 10
          pairings.push({
            id: pairingId,
            event_id: event.id,
            group_number: g + 1,
            tee_time: `2025-${months[events.indexOf(event) % 12]}-15T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
            start_type: 'tee_time',
            start_hole: 1,
            flight_id: null,
          })

          for (let p = 0; p < groupSize; p++) {
            const idx = g * groupSize + p
            if (idx < shuffledContestants.length) {
              pairingPlayers.push({
                id: uuid(),
                pairing_id: pairingId,
                contestant_id: shuffledContestants[idx].id,
                position: p + 1,
                cart_number: Math.floor(idx / 2) + 1,
              })
            }
          }
        }

        if (pairings.length > 0) {
          const { error } = await supabase.from('pairings').insert(pairings)
          if (error) console.error(`pairings error (${event.name}):`, error.message)
        }
        if (pairingPlayers.length > 0) {
          const { error } = await supabase.from('pairing_players').insert(pairingPlayers)
          if (error) console.error(`pairing_players error (${event.name}):`, error.message)
        }
      }

      // --- SCORING (for completed events only) ---
      if (event.status === 'completed' && eventHoles.length > 0) {
        // Create a round for this event
        const roundId = uuid()
        const { error: roundErr } = await supabase.from('rounds').insert({
          id: roundId,
          course_id: event.course_id,
          created_by: profiles[0].id,
          status: 'completed',
          started_at: `${event.event_date}T07:00:00Z`,
          finished_at: `${event.event_date}T14:00:00Z`,
        })
        if (roundErr) console.error(`round error (${event.name}):`, roundErr.message)

        // Round players
        const roundPlayers = contestants.map(c => ({
          id: uuid(),
          round_id: roundId,
          user_id: c.player_id,
        }))
        for (let i = 0; i < roundPlayers.length; i += 50) {
          const { error } = await supabase.from('round_players').insert(roundPlayers.slice(i, i + 50))
          if (error) console.error(`round_players error:`, error.message)
        }

        // Scorecards & hole scores
        const scorecards: any[] = []
        const allHoleScores: any[] = []
        const sortedHoles = eventHoles.sort((a: any, b: any) => a.hole_number - b.hole_number)

        for (const c of contestants) {
          const scId = uuid()
          let totalGross = 0
          
          for (const hole of sortedHoles) {
            // Generate realistic score: par +/- based on handicap
            const hcp = c.hcp ?? 18
            const baseScore = hole.par
            const variance = hcp > 20 ? rand(-1, 3) : hcp > 10 ? rand(-1, 2) : rand(-2, 1)
            const strokes = Math.max(1, baseScore + variance)
            totalGross += strokes
            
            allHoleScores.push({
              id: uuid(),
              scorecard_id: scId,
              hole_number: hole.hole_number,
              strokes,
              putts: rand(1, 3),
              fairway_hit: hole.par > 3 ? Math.random() > 0.3 : null,
              gir: Math.random() > 0.4,
            })
          }

          const netScore = totalGross - (c.hcp ?? 0)
          scorecards.push({
            id: scId,
            round_id: roundId,
            player_id: c.player_id,
            course_id: event.course_id,
            gross_score: totalGross,
            net_score: netScore,
            total_score: totalGross,
            total_putts: allHoleScores.filter((hs: any) => hs.scorecard_id === scId).reduce((sum: number, hs: any) => sum + (hs.putts ?? 0), 0),
          })
        }

        // Insert scorecards
        for (let i = 0; i < scorecards.length; i += 50) {
          const { error } = await supabase.from('scorecards').insert(scorecards.slice(i, i + 50))
          if (error) console.error(`scorecards error:`, error.message)
        }

        // Insert hole scores
        for (let i = 0; i < allHoleScores.length; i += 200) {
          const { error } = await supabase.from('hole_scores').insert(allHoleScores.slice(i, i + 200))
          if (error) console.error(`hole_scores error:`, error.message)
        }

        // --- EVENT RESULTS ---
        const eventWinCats = winCats.filter(wc => wc.tour_id === tourId)
        const eventResults: any[] = []

        for (const cat of eventWinCats) {
          // Filter contestants by flight if applicable
          let catContestants = [...contestants]
          if (cat.flight_id) {
            catContestants = contestants.filter(c => c.flight_id === cat.flight_id)
          }
          if (catContestants.length === 0) continue

          // Sort by score
          const sorted = catContestants
            .map(c => {
              const sc = scorecards.find((s: any) => s.player_id === c.player_id)
              return { ...c, gross: sc?.gross_score ?? 999, net: sc?.net_score ?? 999 }
            })
            .sort((a, b) => cat.calculation_type === 'gross' ? a.gross - b.gross : a.net - b.net)

          for (let r = 0; r < Math.min(cat.rank_count, sorted.length); r++) {
            eventResults.push({
              id: uuid(),
              event_id: event.id,
              category_id: cat.id,
              contestant_id: sorted[r].id,
              score_value: cat.calculation_type === 'gross' ? sorted[r].gross : sorted[r].net,
              rank_position: r + 1,
            })
          }
        }

        if (eventResults.length > 0) {
          for (let i = 0; i < eventResults.length; i += 50) {
            const { error } = await supabase.from('event_results').insert(eventResults.slice(i, i + 50))
            if (error) console.error(`event_results error:`, error.message)
          }
        }

        // --- HANDICAP HISTORY ---
        const hcpHistory: any[] = []
        for (const c of contestants) {
          const sc = scorecards.find((s: any) => s.player_id === c.player_id)
          if (!sc) continue
          const oldHcp = c.hcp ?? 18
          const diff = (sc.gross_score ?? 72) - (eventCourse?.par ?? 72)
          let newHcp = oldHcp
          if (diff < -2) newHcp = Math.max(0, oldHcp - 1)
          else if (diff > 4) newHcp = Math.min(36, oldHcp + 1)

          hcpHistory.push({
            id: uuid(),
            player_id: c.player_id,
            event_id: event.id,
            old_hcp: oldHcp,
            new_hcp: newHcp,
            gross_score: sc.gross_score,
            net_score: sc.net_score,
            sandbagging_flag: diff < -5,
          })
        }

        if (hcpHistory.length > 0) {
          for (let i = 0; i < hcpHistory.length; i += 50) {
            const { error } = await supabase.from('handicap_history').insert(hcpHistory.slice(i, i + 50))
            if (error) console.error(`handicap_history error:`, error.message)
          }
        }
      }

      console.log(`Event "${event.name}" seeded`)
    }

    console.log('All seeding complete!')
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          profiles: profiles.length,
          clubs: clubs.length,
          courses: courses.length,
          members: members.length,
          staff: staffRecords.length,
          tours: tours.length,
          tour_players: tourPlayers.length,
          events: events.length,
          flights: flights.length,
          winner_categories: winCats.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Seed error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
