import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Download, Database, Loader2, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const queries = [
  // 1. PROFILES & USERS
  { category: 'Profiles & Users', no: 1, description: 'Daftar semua profil pengguna', query: 'SELECT * FROM profiles' },
  { category: 'Profiles & Users', no: 2, description: 'Ranking pemain berdasarkan handicap', query: 'SELECT * FROM profiles WHERE handicap IS NOT NULL ORDER BY handicap' },
  { category: 'Profiles & Users', no: 3, description: 'Distribusi pemain per lokasi', query: "SELECT location, COUNT(*) FROM profiles GROUP BY location" },
  { category: 'Profiles & Users', no: 4, description: 'Cari pemain berdasarkan nama', query: "SELECT * FROM profiles WHERE full_name ILIKE '%keyword%'" },

  // 2. CLUBS
  { category: 'Clubs', no: 5, description: 'Daftar semua klub (non-personal)', query: 'SELECT * FROM clubs WHERE is_personal = false' },
  { category: 'Clubs', no: 6, description: 'Daftar klub beserta pemiliknya', query: 'SELECT c.*, p.full_name AS owner_name FROM clubs c JOIN profiles p ON p.id = c.owner_id' },
  { category: 'Clubs', no: 7, description: 'Jumlah anggota per klub', query: 'SELECT c.*, COUNT(m.id) AS total_members FROM clubs c LEFT JOIN members m ON m.club_id = c.id GROUP BY c.id' },
  { category: 'Clubs', no: 8, description: 'Klub yang dimiliki user tertentu', query: "SELECT * FROM clubs WHERE owner_id = '<user_id>'" },

  // 3. MEMBERS
  { category: 'Members', no: 9, description: 'Daftar lengkap keanggotaan', query: 'SELECT m.*, p.full_name, c.name AS club_name FROM members m JOIN profiles p ON p.id = m.user_id JOIN clubs c ON c.id = m.club_id' },
  { category: 'Members', no: 10, description: 'Klub yang diikuti user tertentu', query: "SELECT * FROM members WHERE user_id = '<user_id>'" },
  { category: 'Members', no: 11, description: 'Distribusi role di suatu klub', query: "SELECT m.role, COUNT(*) FROM members m WHERE club_id = '<club_id>' GROUP BY m.role" },
  { category: 'Members', no: 12, description: 'Owner dari suatu klub', query: "SELECT p.* FROM members m JOIN profiles p ON p.id = m.user_id WHERE m.club_id = '<club_id>' AND m.role = 'owner'" },

  // 4. CLUB STAFF
  { category: 'Club Staff', no: 13, description: 'Seluruh staff dari semua klub', query: 'SELECT cs.*, p.full_name, c.name FROM club_staff cs JOIN profiles p ON p.id = cs.user_id JOIN clubs c ON c.id = cs.club_id' },
  { category: 'Club Staff', no: 14, description: 'Daftar semua caddy', query: "SELECT * FROM club_staff WHERE staff_role = 'caddy'" },
  { category: 'Club Staff', no: 15, description: 'Daftar semua marshal', query: "SELECT * FROM club_staff WHERE staff_role = 'marshal'" },
  { category: 'Club Staff', no: 16, description: 'Distribusi staff role per klub', query: "SELECT staff_role, COUNT(*) FROM club_staff WHERE club_id = '<club_id>' GROUP BY staff_role" },
  { category: 'Club Staff', no: 17, description: 'Staff aktif di suatu klub', query: "SELECT cs.*, p.full_name FROM club_staff cs JOIN profiles p ON p.id = cs.user_id WHERE cs.club_id = '<club_id>' AND cs.status = 'active'" },

  // 5. CLUB INVITATIONS
  { category: 'Club Invitations', no: 18, description: 'Semua undangan klub', query: 'SELECT ci.*, p.full_name AS invited_by_name, c.name AS club_name FROM club_invitations ci JOIN profiles p ON p.id = ci.invited_by JOIN clubs c ON c.id = ci.club_id' },
  { category: 'Club Invitations', no: 19, description: 'Undangan yang belum direspon', query: "SELECT * FROM club_invitations WHERE status = 'pending'" },
  { category: 'Club Invitations', no: 20, description: 'Undangan untuk user tertentu', query: "SELECT * FROM club_invitations WHERE invited_user_id = '<user_id>'" },
  { category: 'Club Invitations', no: 21, description: 'Jumlah undangan per klub', query: 'SELECT c.name, COUNT(*) FROM club_invitations ci JOIN clubs c ON c.id = ci.club_id GROUP BY c.name' },

  // 6. BUDDY CONNECTIONS
  { category: 'Buddy Connections', no: 22, description: 'Semua koneksi pertemanan', query: 'SELECT bc.*, p1.full_name AS requester, p2.full_name AS addressee FROM buddy_connections bc JOIN profiles p1 ON p1.id = bc.requester_id JOIN profiles p2 ON p2.id = bc.addressee_id' },
  { category: 'Buddy Connections', no: 23, description: 'Permintaan pertemanan masuk', query: "SELECT * FROM buddy_connections WHERE status = 'pending' AND addressee_id = '<user_id>'" },
  { category: 'Buddy Connections', no: 24, description: 'Daftar teman user', query: "SELECT * FROM buddy_connections WHERE status = 'accepted' AND (requester_id = '<user_id>' OR addressee_id = '<user_id>')" },
  { category: 'Buddy Connections', no: 25, description: 'Statistik koneksi', query: 'SELECT status, COUNT(*) FROM buddy_connections GROUP BY status' },

  // 7. COURSES
  { category: 'Courses', no: 26, description: 'Semua lapangan beserta klub', query: 'SELECT co.*, c.name AS club_name FROM courses co LEFT JOIN clubs c ON c.id = co.club_id' },
  { category: 'Courses', no: 27, description: 'Lapangan 18 hole', query: 'SELECT * FROM courses WHERE holes_count = 18' },
  { category: 'Courses', no: 28, description: 'Lapangan termurah', query: 'SELECT * FROM courses ORDER BY green_fee_price ASC' },
  { category: 'Courses', no: 29, description: 'Cari lapangan per lokasi', query: "SELECT * FROM courses WHERE location ILIKE '%keyword%'" },

  // 8. COURSE HOLES
  { category: 'Course Holes', no: 30, description: 'Detail hole semua lapangan', query: 'SELECT ch.*, co.name AS course_name FROM course_holes ch JOIN courses co ON co.id = ch.course_id ORDER BY co.name, ch.hole_number' },
  { category: 'Course Holes', no: 31, description: 'Total par per lapangan', query: 'SELECT course_id, SUM(par) AS total_par FROM course_holes GROUP BY course_id' },
  { category: 'Course Holes', no: 32, description: 'Detail hole lapangan tertentu', query: "SELECT * FROM course_holes WHERE course_id = '<course_id>' ORDER BY hole_number" },

  // 9. COURSE TEES
  { category: 'Course Tees', no: 33, description: 'Semua tee box', query: 'SELECT ct.*, co.name AS course_name FROM course_tees ct JOIN courses co ON co.id = ct.course_id' },
  { category: 'Course Tees', no: 34, description: 'Tee box per lapangan berdasarkan rating', query: "SELECT * FROM course_tees WHERE course_id = '<course_id>' ORDER BY rating DESC" },

  // 10. TOURS
  { category: 'Tours', no: 35, description: 'Semua tour beserta penyelenggara', query: 'SELECT t.*, c.name AS organizer FROM tours t JOIN clubs c ON c.id = t.organizer_club_id' },
  { category: 'Tours', no: 36, description: 'Tour tahun tertentu', query: 'SELECT * FROM tours WHERE year = 2026' },
  { category: 'Tours', no: 37, description: 'Tour tipe internal', query: "SELECT * FROM tours WHERE tournament_type = 'internal'" },
  { category: 'Tours', no: 38, description: 'Tour beserta jumlah event', query: 'SELECT t.*, COUNT(e.id) AS total_events FROM tours t LEFT JOIN events e ON e.tour_id = t.id GROUP BY t.id' },

  // 11. TOUR CLUBS
  { category: 'Tour Clubs', no: 39, description: 'Klub peserta tour', query: 'SELECT tc.*, c.name AS club_name, t.name AS tour_name FROM tour_clubs tc JOIN clubs c ON c.id = tc.club_id JOIN tours t ON t.id = tc.tour_id' },
  { category: 'Tour Clubs', no: 40, description: 'Klub yang sudah diterima di tour', query: "SELECT tc.*, c.name FROM tour_clubs tc JOIN clubs c ON c.id = tc.club_id WHERE tc.tour_id = '<tour_id>' AND tc.status = 'accepted'" },
  { category: 'Tour Clubs', no: 41, description: 'Total kuota tiket per tour', query: 'SELECT tour_id, SUM(ticket_quota) FROM tour_clubs GROUP BY tour_id' },

  // 12. TOUR PLAYERS
  { category: 'Tour Players', no: 42, description: 'Semua pemain terdaftar di tour', query: 'SELECT tp.*, p.full_name, p.handicap, c.name AS club_name FROM tour_players tp JOIN profiles p ON p.id = tp.player_id JOIN clubs c ON c.id = tp.club_id' },
  { category: 'Tour Players', no: 43, description: 'Pemain per klub di tour tertentu', query: "SELECT tp.*, p.full_name FROM tour_players tp JOIN profiles p ON p.id = tp.player_id WHERE tp.tour_id = '<tour_id>' AND tp.club_id = '<club_id>'" },
  { category: 'Tour Players', no: 44, description: 'Jumlah pemain per klub di tour', query: "SELECT club_id, COUNT(*) FROM tour_players WHERE tour_id = '<tour_id>' GROUP BY club_id" },

  // 13. TOURNAMENT FLIGHTS
  { category: 'Tournament Flights', no: 45, description: 'Flight di tour tertentu', query: "SELECT * FROM tournament_flights WHERE tour_id = '<tour_id>' ORDER BY display_order" },
  { category: 'Tournament Flights', no: 46, description: 'Jumlah kontestan per flight', query: 'SELECT tf.*, COUNT(c.id) AS total_contestants FROM tournament_flights tf LEFT JOIN contestants c ON c.flight_id = tf.id GROUP BY tf.id' },

  // 14. WINNER CATEGORIES
  { category: 'Winner Categories', no: 47, description: 'Kategori pemenang per tour', query: "SELECT wc.*, tf.flight_name FROM tournament_winner_categories wc LEFT JOIN tournament_flights tf ON tf.id = wc.flight_id WHERE wc.tour_id = '<tour_id>'" },
  { category: 'Winner Categories', no: 48, description: "Kategori berbasis net score", query: "SELECT * FROM tournament_winner_categories WHERE calculation_type = 'net'" },
  { category: 'Winner Categories', no: 49, description: "Kategori berbasis gross score", query: "SELECT * FROM tournament_winner_categories WHERE calculation_type = 'gross'" },

  // 15. EVENTS
  { category: 'Events', no: 50, description: 'Semua event lengkap', query: 'SELECT e.*, t.name AS tour_name, co.name AS course_name FROM events e JOIN tours t ON t.id = e.tour_id JOIN courses co ON co.id = e.course_id' },
  { category: 'Events', no: 51, description: 'Event berstatus draft', query: "SELECT * FROM events WHERE status = 'draft'" },
  { category: 'Events', no: 52, description: 'Event mendatang', query: 'SELECT * FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date' },
  { category: 'Events', no: 53, description: 'Event yang sudah selesai', query: 'SELECT * FROM events WHERE event_date < CURRENT_DATE ORDER BY event_date DESC' },
  { category: 'Events', no: 54, description: 'Jumlah event per tour', query: 'SELECT tour_id, COUNT(*) FROM events GROUP BY tour_id' },

  // 16. TICKETS
  { category: 'Tickets', no: 55, description: 'Semua tiket lengkap', query: 'SELECT tk.*, c.name AS club_name, p.full_name AS assigned_to FROM tickets tk JOIN clubs c ON c.id = tk.club_id LEFT JOIN profiles p ON p.id = tk.assigned_player_id' },
  { category: 'Tickets', no: 56, description: 'Distribusi status tiket per event', query: "SELECT status, COUNT(*) FROM tickets WHERE event_id = '<event_id>' GROUP BY status" },
  { category: 'Tickets', no: 57, description: 'Tiket tersedia di event', query: "SELECT tk.* FROM tickets tk WHERE tk.event_id = '<event_id>' AND tk.status = 'available'" },
  { category: 'Tickets', no: 58, description: 'Alokasi tiket per klub', query: "SELECT club_id, COUNT(*) FROM tickets WHERE event_id = '<event_id>' GROUP BY club_id" },

  // 17. CONTESTANTS
  { category: 'Contestants', no: 59, description: 'Semua kontestan lengkap', query: 'SELECT c.*, p.full_name, p.handicap, e.name AS event_name FROM contestants c JOIN profiles p ON p.id = c.player_id JOIN events e ON e.id = c.event_id' },
  { category: 'Contestants', no: 60, description: 'Kontestan aktif di event', query: "SELECT * FROM contestants WHERE event_id = '<event_id>' AND status = 'competitor'" },
  { category: 'Contestants', no: 61, description: 'Kontestan per flight', query: "SELECT c.*, tf.flight_name FROM contestants c LEFT JOIN tournament_flights tf ON tf.id = c.flight_id WHERE c.event_id = '<event_id>'" },
  { category: 'Contestants', no: 62, description: 'Jumlah kontestan per event', query: 'SELECT event_id, COUNT(*) FROM contestants GROUP BY event_id' },

  // 18. PAIRINGS
  { category: 'Pairings', no: 63, description: 'Semua pairing/group', query: 'SELECT pa.*, e.name AS event_name FROM pairings pa JOIN events e ON e.id = pa.event_id ORDER BY pa.group_number' },
  { category: 'Pairings', no: 64, description: 'Detail pemain per group', query: 'SELECT pp.*, p.full_name, pa.group_number, pa.tee_time, pa.start_hole FROM pairing_players pp JOIN contestants c ON c.id = pp.contestant_id JOIN profiles p ON p.id = c.player_id JOIN pairings pa ON pa.id = pp.pairing_id' },
  { category: 'Pairings', no: 65, description: 'Jumlah pemain per group', query: 'SELECT pa.*, COUNT(pp.id) AS player_count FROM pairings pa LEFT JOIN pairing_players pp ON pp.pairing_id = pa.id GROUP BY pa.id' },
  { category: 'Pairings', no: 66, description: 'Pairing tipe shotgun start', query: "SELECT * FROM pairings WHERE start_type = 'shotgun'" },

  // 19. EVENT CHECK-INS
  { category: 'Event Check-ins', no: 67, description: 'Semua check-in', query: 'SELECT ec.*, p.full_name FROM event_checkins ec JOIN contestants c ON c.id = ec.contestant_id JOIN profiles p ON p.id = c.player_id' },
  { category: 'Event Check-ins', no: 68, description: 'Rasio check-in per event', query: "SELECT COUNT(*) AS checked_in, (SELECT COUNT(*) FROM contestants WHERE event_id = '<event_id>') AS total FROM event_checkins WHERE event_id = '<event_id>'" },
  { category: 'Event Check-ins', no: 69, description: 'Alokasi locker & bag drop', query: "SELECT ec.locker_number, ec.bag_drop_number, p.full_name FROM event_checkins ec JOIN contestants c ON c.id = ec.contestant_id JOIN profiles p ON p.id = c.player_id WHERE ec.event_id = '<event_id>'" },

  // 20. CADDY ASSIGNMENTS
  { category: 'Caddy Assignments', no: 70, description: 'Semua penugasan caddy', query: 'SELECT ca.*, p_caddy.full_name AS caddy_name, p_player.full_name AS player_name FROM caddy_assignments ca JOIN profiles p_caddy ON p_caddy.id = ca.caddy_id JOIN contestants c ON c.id = ca.contestant_id JOIN profiles p_player ON p_player.id = c.player_id' },
  { category: 'Caddy Assignments', no: 71, description: 'Statistik penugasan per caddy', query: 'SELECT ca.caddy_id, p.full_name, COUNT(*) AS total_assignments FROM caddy_assignments ca JOIN profiles p ON p.id = ca.caddy_id GROUP BY ca.caddy_id, p.full_name' },
  { category: 'Caddy Assignments', no: 72, description: 'Kontestan tanpa caddy', query: "SELECT c.id FROM contestants c WHERE c.event_id = '<event_id>' AND c.id NOT IN (SELECT contestant_id FROM caddy_assignments WHERE event_id = '<event_id>')" },

  // 21. GOLF CART ASSIGNMENTS
  { category: 'Golf Cart Assignments', no: 73, description: 'Alokasi cart per event', query: "SELECT gca.cart_number, p.full_name FROM golf_cart_assignments gca JOIN contestants c ON c.id = gca.contestant_id JOIN profiles p ON p.id = c.player_id WHERE gca.event_id = '<event_id>' ORDER BY gca.cart_number" },
  { category: 'Golf Cart Assignments', no: 74, description: 'Jumlah penumpang per cart', query: "SELECT cart_number, COUNT(*) AS riders FROM golf_cart_assignments WHERE event_id = '<event_id>' GROUP BY cart_number ORDER BY cart_number" },
  { category: 'Golf Cart Assignments', no: 75, description: 'Total cart digunakan', query: "SELECT MAX(cart_number) AS total_carts FROM golf_cart_assignments WHERE event_id = '<event_id>'" },

  // 22. SCORECARDS & HOLE SCORES
  { category: 'Scorecards & Hole Scores', no: 76, description: 'Semua scorecard', query: 'SELECT sc.*, p.full_name, co.name AS course_name FROM scorecards sc JOIN profiles p ON p.id = sc.player_id LEFT JOIN courses co ON co.id = sc.course_id' },
  { category: 'Scorecards & Hole Scores', no: 77, description: 'Detail skor per hole', query: "SELECT hs.* FROM hole_scores hs WHERE hs.scorecard_id = '<scorecard_id>' ORDER BY hs.hole_number" },
  { category: 'Scorecards & Hole Scores', no: 78, description: 'Ranking scorecard per round', query: "SELECT sc.player_id, p.full_name, sc.gross_score, sc.net_score, sc.total_putts FROM scorecards sc JOIN profiles p ON p.id = sc.player_id WHERE sc.round_id = '<round_id>' ORDER BY sc.gross_score" },
  { category: 'Scorecards & Hole Scores', no: 79, description: 'Statistik per scorecard (FIR, GIR, putts)', query: 'SELECT scorecard_id, COUNT(*) FILTER (WHERE fairway_hit = true) AS fir, COUNT(*) FILTER (WHERE gir = true) AS gir_count, SUM(putts) AS total_putts FROM hole_scores GROUP BY scorecard_id' },
  { category: 'Scorecards & Hole Scores', no: 80, description: 'Rata-rata stroke per hole di suatu lapangan', query: "SELECT AVG(strokes) AS avg_strokes, hole_number FROM hole_scores hs JOIN scorecards sc ON sc.id = hs.scorecard_id WHERE sc.course_id = '<course_id>' GROUP BY hole_number ORDER BY hole_number" },

  // 23. HANDICAP HISTORY
  { category: 'Handicap History', no: 81, description: 'Riwayat perubahan handicap', query: 'SELECT hh.*, p.full_name, e.name AS event_name FROM handicap_history hh JOIN profiles p ON p.id = hh.player_id JOIN events e ON e.id = hh.event_id ORDER BY hh.created_at DESC' },
  { category: 'Handicap History', no: 82, description: 'Trend handicap pemain tertentu', query: "SELECT * FROM handicap_history WHERE player_id = '<player_id>' ORDER BY created_at" },
  { category: 'Handicap History', no: 83, description: 'Deteksi sandbagging', query: 'SELECT * FROM handicap_history WHERE sandbagging_flag = true' },
  { category: 'Handicap History', no: 84, description: 'View trend handicap pemain', query: "SELECT * FROM player_handicap_trend WHERE player_id = '<player_id>'" },

  // 24. EVENT RESULTS
  { category: 'Event Results', no: 85, description: 'Semua pemenang event', query: 'SELECT er.*, p.full_name, wc.category_name FROM event_results er JOIN contestants c ON c.id = er.contestant_id JOIN profiles p ON p.id = c.player_id JOIN tournament_winner_categories wc ON wc.id = er.category_id' },
  { category: 'Event Results', no: 86, description: 'Pemenang per event', query: "SELECT er.*, p.full_name FROM event_results er JOIN contestants c ON c.id = er.contestant_id JOIN profiles p ON p.id = c.player_id WHERE er.event_id = '<event_id>' ORDER BY er.rank_position" },
  { category: 'Event Results', no: 87, description: 'Pemain dengan kemenangan terbanyak', query: 'SELECT p.full_name, COUNT(*) AS wins FROM event_results er JOIN contestants c ON c.id = er.contestant_id JOIN profiles p ON p.id = c.player_id WHERE er.rank_position = 1 GROUP BY p.full_name ORDER BY wins DESC' },

  // 25. EVENT LEADERBOARD (VIEW)
  { category: 'Event Leaderboard', no: 88, description: 'Leaderboard net per event', query: "SELECT el.*, p.full_name FROM event_leaderboard el JOIN profiles p ON p.id = el.player_id WHERE el.event_id = '<event_id>' ORDER BY el.rank_net" },
  { category: 'Event Leaderboard', no: 89, description: 'Leaderboard gross per event', query: "SELECT el.*, p.full_name FROM event_leaderboard el JOIN profiles p ON p.id = el.player_id WHERE el.event_id = '<event_id>' ORDER BY el.rank_gross" },
  { category: 'Event Leaderboard', no: 90, description: 'Leaderboard per flight', query: "SELECT el.*, p.full_name, tf.flight_name FROM event_leaderboard el JOIN profiles p ON p.id = el.player_id LEFT JOIN tournament_flights tf ON tf.id = el.flight_id WHERE el.event_id = '<event_id>'" },

  // 26. ROUNDS
  { category: 'Rounds', no: 91, description: 'Semua round', query: 'SELECT r.*, co.name AS course_name, p.full_name AS creator FROM rounds r JOIN courses co ON co.id = r.course_id JOIN profiles p ON p.id = r.created_by' },
  { category: 'Rounds', no: 92, description: 'Pemain dalam round tertentu', query: "SELECT rp.*, p.full_name FROM round_players rp JOIN profiles p ON p.id = rp.user_id WHERE rp.round_id = '<round_id>'" },
  { category: 'Rounds', no: 93, description: 'Round beserta jumlah pemain', query: 'SELECT r.*, COUNT(rp.id) AS player_count FROM rounds r LEFT JOIN round_players rp ON rp.round_id = r.id GROUP BY r.id' },
  { category: 'Rounds', no: 94, description: 'Round yang sedang berlangsung', query: "SELECT * FROM rounds WHERE status = 'active'" },

  // 27. TEE TIME BOOKINGS
  { category: 'Tee Time Bookings', no: 95, description: 'Semua booking tee time', query: 'SELECT ttb.*, co.name AS course_name, p.full_name FROM tee_time_bookings ttb JOIN courses co ON co.id = ttb.course_id JOIN profiles p ON p.id = ttb.user_id' },
  { category: 'Tee Time Bookings', no: 96, description: 'Booking hari ini', query: 'SELECT * FROM tee_time_bookings WHERE booking_date = CURRENT_DATE' },
  { category: 'Tee Time Bookings', no: 97, description: 'Jumlah booking per tanggal', query: "SELECT booking_date, COUNT(*) FROM tee_time_bookings WHERE course_id = '<course_id>' GROUP BY booking_date" },
  { category: 'Tee Time Bookings', no: 98, description: 'Total pendapatan booking per lapangan', query: "SELECT SUM(total_price) FROM tee_time_bookings WHERE course_id = '<course_id>' AND status = 'confirmed'" },

  // 28. CONVERSATIONS & CHAT
  { category: 'Conversations & Chat', no: 99, description: 'Percakapan beserta jumlah pesan', query: 'SELECT cv.*, COUNT(cm.id) AS message_count FROM conversations cv LEFT JOIN chat_messages cm ON cm.conversation_id = cv.id GROUP BY cv.id' },
  { category: 'Conversations & Chat', no: 100, description: 'Peserta percakapan', query: "SELECT cp.*, p.full_name FROM conversation_participants cp JOIN profiles p ON p.id = cp.user_id WHERE cp.conversation_id = '<conv_id>'" },
  { category: 'Conversations & Chat', no: 101, description: 'Pesan dalam percakapan', query: "SELECT cm.*, p.full_name FROM chat_messages cm JOIN profiles p ON p.id = cm.sender_id WHERE cm.conversation_id = '<conv_id>' ORDER BY cm.created_at" },
  { category: 'Conversations & Chat', no: 102, description: 'Pesan terbaru user', query: "SELECT cm.* FROM chat_messages cm WHERE cm.conversation_id IN (SELECT cp.conversation_id FROM conversation_participants cp WHERE cp.user_id = '<user_id>') ORDER BY cm.created_at DESC LIMIT 20" },

  // 29. CROSS-TABLE ANALYTICS
  { category: 'Cross-Table Analytics', no: 103, description: 'Ringkasan partisipasi pemain', query: 'SELECT p.full_name, COUNT(DISTINCT tp.tour_id) AS tours, COUNT(DISTINCT c2.event_id) AS events FROM profiles p LEFT JOIN tour_players tp ON tp.player_id = p.id LEFT JOIN contestants c2 ON c2.player_id = p.id GROUP BY p.id' },
  { category: 'Cross-Table Analytics', no: 104, description: 'Dashboard klub lengkap', query: "SELECT c.name, COUNT(DISTINCT m.id) AS members, COUNT(DISTINCT cs.id) AS staff, COUNT(DISTINCT t.id) AS tours FROM clubs c LEFT JOIN members m ON m.club_id = c.id LEFT JOIN club_staff cs ON cs.club_id = c.id LEFT JOIN tours t ON t.organizer_club_id = c.id WHERE c.is_personal = false GROUP BY c.id" },
  { category: 'Cross-Table Analytics', no: 105, description: 'Dashboard operasional event', query: 'SELECT e.name, e.event_date, COUNT(DISTINCT ct.id) AS contestants, COUNT(DISTINCT ec.id) AS checked_in, COUNT(DISTINCT ca.id) AS caddies, COUNT(DISTINCT gca.id) AS carts FROM events e LEFT JOIN contestants ct ON ct.event_id = e.id LEFT JOIN event_checkins ec ON ec.event_id = e.id LEFT JOIN caddy_assignments ca ON ca.event_id = e.id LEFT JOIN golf_cart_assignments gca ON gca.event_id = e.id GROUP BY e.id' },
  { category: 'Cross-Table Analytics', no: 106, description: 'Member lengkap dengan staff role', query: 'SELECT m.role, m.joined_at, p.full_name, p.handicap, cs.staff_role, cs.status AS staff_status, c.name AS club_name FROM members m JOIN profiles p ON p.id = m.user_id JOIN clubs c ON c.id = m.club_id LEFT JOIN club_staff cs ON cs.user_id = m.user_id AND cs.club_id = m.club_id' },
];

const allPages = [
  { path: '/login', name: 'Login' },
  { path: '/news', name: 'NewsFeed' },
  { path: '/clubs', name: 'Clubs' },
  { path: '/tour', name: 'TourList' },
  { path: '/venue', name: 'VenueList' },
  { path: '/play', name: 'Play' },
  { path: '/profile', name: 'GolferProfile' },
  { path: '/settings', name: 'Settings' },
  { path: '/chat', name: 'ChatList' },
  { path: '/admin', name: 'AdminDashboard' },
];

const ExportQueries = () => {
  const [loading, setLoading] = useState(false);
  const [loadingPng, setLoadingPng] = useState(false);
  const [pngProgress, setPngProgress] = useState('');

  const handleDownload = () => {
    const wsData = queries.map(q => ({
      'No': q.no,
      'Kategori': q.category,
      'Deskripsi': q.description,
      'SQL Query': q.query,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 45 },
      { wch: 120 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'SQL Queries');
    XLSX.writeFile(wb, 'CFGolf_SQL_Queries.xlsx');
  };

  const escapeSQL = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const handleExportData = async () => {
    setLoading(true);
    const tableNames = [
      'profiles', 'clubs', 'members', 'club_staff', 'club_invitations',
      'buddy_connections', 'courses', 'course_holes', 'course_tees',
      'tours', 'tour_clubs', 'tour_players', 'tournament_flights',
      'tournament_winner_categories', 'events', 'tickets', 'contestants',
      'pairings', 'pairing_players', 'event_checkins', 'caddy_assignments',
      'golf_cart_assignments', 'scorecards', 'hole_scores', 'handicap_history',
      'event_results', 'rounds', 'round_players', 'tee_time_bookings',
      'conversations', 'conversation_participants', 'chat_messages',
    ] as const;

    let sql = `-- CFGolf Database Export\n-- Generated: ${new Date().toISOString()}\n\n`;

    try {
      for (const table of tableNames) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          sql += `-- ERROR fetching ${table}: ${error.message}\n\n`;
          continue;
        }
        if (!data || data.length === 0) {
          sql += `-- Table: ${table} (empty)\n\n`;
          continue;
        }

        sql += `-- Table: ${table} (${data.length} rows)\n`;
        const columns = Object.keys(data[0]);

        for (const row of data) {
          const values = columns.map(col => escapeSQL((row as Record<string, unknown>)[col]));
          sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }

      const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CFGolf_Data_Export.sql';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const capturePageAsCanvas = (pagePath: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '430px';
      iframe.style.height = '932px';
      iframe.style.border = 'none';
      iframe.src = pagePath;
      document.body.appendChild(iframe);

      iframe.onload = async () => {
        try {
          await new Promise(r => setTimeout(r, 2000));
          const doc = iframe.contentDocument;
          if (!doc || !doc.body) throw new Error('Cannot access iframe');
          const canvas = await html2canvas(doc.body, {
            width: 430,
            height: 932,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#000000',
          });
          resolve(canvas);
        } catch (err) {
          reject(err);
        } finally {
          document.body.removeChild(iframe);
        }
      };

      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error(`Failed to load ${pagePath}`));
      };
    });
  };

  const handleExportPng = async () => {
    setLoadingPng(true);
    const zip = new JSZip();

    try {
      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        setPngProgress(`Capturing ${page.name} (${i + 1}/${allPages.length})...`);
        try {
          const canvas = await capturePageAsCanvas(page.path);
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
          zip.file(`${String(i + 1).padStart(2, '0')}_${page.name}.png`, blob);
        } catch (err) {
          console.warn(`Failed to capture ${page.name}:`, err);
        }
      }

      setPngProgress('Creating ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CFGolf_Pages_Screenshots.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PNG export failed:', e);
    } finally {
      setLoadingPng(false);
      setPngProgress('');
    }
  };

  const [loggedIn, setLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });
  }, []);

  const handleAutoLogin = async () => {
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: 'carl.ramos.277@test.com',
      password: 'GolfTest2025!',
    });
    setLoginLoading(false);
    if (error) {
      console.error('Login failed:', error.message);
    } else {
      setLoggedIn(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl font-bold text-foreground">Export Data</h1>
        <p className="text-muted-foreground">
          Download referensi SQL queries, export data tabel, atau screenshot semua halaman
        </p>

        {!loggedIn && (
          <div className="golf-card p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Login sebagai <strong>Carl Ramos</strong> (data paling lengkap: 4 klub, 14 event, 8 scorecard)</p>
            <Button onClick={handleAutoLogin} size="sm" variant="secondary" className="gap-2" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loginLoading ? 'Logging in...' : 'Quick Login sebagai Carl Ramos'}
            </Button>
          </div>
        )}

        {loggedIn && (
          <p className="text-xs text-primary font-medium">✓ Logged in — data export akan menyertakan data user</p>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={handleDownload} size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Download SQL Queries (XLSX)
          </Button>
          <Button onClick={handleExportData} size="lg" variant="secondary" className="gap-2" disabled={loading || !loggedIn}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
            {loading ? 'Exporting...' : 'Export Semua Data (SQL)'}
          </Button>
          <Button onClick={handleExportPng} size="lg" variant="outline" className="gap-2" disabled={loadingPng || !loggedIn}>
            {loadingPng ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
            {loadingPng ? pngProgress : 'Export Semua Halaman (PNG)'}
          </Button>
        </div>
        {loadingPng && (
          <p className="text-xs text-muted-foreground animate-pulse">{pngProgress}</p>
        )}
      </div>
    </div>
  );
};

export default ExportQueries;
