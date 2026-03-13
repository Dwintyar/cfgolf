
-- Clean duplicate clubs: keep earliest, delete rest and their children
WITH dup_clubs AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
  FROM clubs
)
, clubs_to_delete AS (
  SELECT id FROM dup_clubs WHERE rn > 1
)
-- Delete children of duplicate clubs
, del_staff AS (DELETE FROM club_staff WHERE club_id IN (SELECT id FROM clubs_to_delete))
, del_members AS (DELETE FROM members WHERE club_id IN (SELECT id FROM clubs_to_delete))
, del_tour_clubs AS (DELETE FROM tour_clubs WHERE club_id IN (SELECT id FROM clubs_to_delete))
, del_tour_players AS (DELETE FROM tour_players WHERE club_id IN (SELECT id FROM clubs_to_delete))
, courses_to_delete AS (SELECT id FROM courses WHERE club_id IN (SELECT id FROM clubs_to_delete))
, del_course_holes AS (DELETE FROM course_holes WHERE course_id IN (SELECT id FROM courses_to_delete))
, del_course_tees AS (DELETE FROM course_tees WHERE course_id IN (SELECT id FROM courses_to_delete))
, del_courses AS (DELETE FROM courses WHERE club_id IN (SELECT id FROM clubs_to_delete))
DELETE FROM clubs WHERE id IN (SELECT id FROM clubs_to_delete);

-- Clean duplicate tours: keep earliest, delete rest and their children
WITH dup_tours AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
  FROM tours
)
, tours_to_delete AS (
  SELECT id FROM dup_tours WHERE rn > 1
)
, events_to_delete AS (SELECT id FROM events WHERE tour_id IN (SELECT id FROM tours_to_delete))
, del_event_results AS (DELETE FROM event_results WHERE event_id IN (SELECT id FROM events_to_delete))
, del_event_checkins AS (DELETE FROM event_checkins WHERE event_id IN (SELECT id FROM events_to_delete))
, del_caddy AS (DELETE FROM caddy_assignments WHERE event_id IN (SELECT id FROM events_to_delete))
, del_carts AS (DELETE FROM golf_cart_assignments WHERE event_id IN (SELECT id FROM events_to_delete))
, del_pp AS (DELETE FROM pairing_players WHERE pairing_id IN (SELECT id FROM pairings WHERE event_id IN (SELECT id FROM events_to_delete)))
, del_pairings AS (DELETE FROM pairings WHERE event_id IN (SELECT id FROM events_to_delete))
, del_tickets AS (DELETE FROM tickets WHERE event_id IN (SELECT id FROM events_to_delete))
, del_contestants AS (DELETE FROM contestants WHERE event_id IN (SELECT id FROM events_to_delete))
, del_hh AS (DELETE FROM handicap_history WHERE event_id IN (SELECT id FROM events_to_delete))
, del_events AS (DELETE FROM events WHERE tour_id IN (SELECT id FROM tours_to_delete))
, del_wc AS (DELETE FROM tournament_winner_categories WHERE tour_id IN (SELECT id FROM tours_to_delete))
, del_flights AS (DELETE FROM tournament_flights WHERE tour_id IN (SELECT id FROM tours_to_delete))
, del_tp AS (DELETE FROM tour_players WHERE tour_id IN (SELECT id FROM tours_to_delete))
, del_tc AS (DELETE FROM tour_clubs WHERE tour_id IN (SELECT id FROM tours_to_delete))
DELETE FROM tours WHERE id IN (SELECT id FROM tours_to_delete);

-- Clean duplicate events (same name, keep earliest)
WITH dup_events AS (
  SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
  FROM events
)
, events_to_delete AS (SELECT id FROM dup_events WHERE rn > 1)
, del_er AS (DELETE FROM event_results WHERE event_id IN (SELECT id FROM events_to_delete))
, del_ec AS (DELETE FROM event_checkins WHERE event_id IN (SELECT id FROM events_to_delete))
, del_ca AS (DELETE FROM caddy_assignments WHERE event_id IN (SELECT id FROM events_to_delete))
, del_gc AS (DELETE FROM golf_cart_assignments WHERE event_id IN (SELECT id FROM events_to_delete))
, del_pp2 AS (DELETE FROM pairing_players WHERE pairing_id IN (SELECT id FROM pairings WHERE event_id IN (SELECT id FROM events_to_delete)))
, del_p2 AS (DELETE FROM pairings WHERE event_id IN (SELECT id FROM events_to_delete))
, del_t2 AS (DELETE FROM tickets WHERE event_id IN (SELECT id FROM events_to_delete))
, del_c2 AS (DELETE FROM contestants WHERE event_id IN (SELECT id FROM events_to_delete))
, del_hh2 AS (DELETE FROM handicap_history WHERE event_id IN (SELECT id FROM events_to_delete))
DELETE FROM events WHERE id IN (SELECT id FROM events_to_delete);

-- Clean duplicate members (same club_id + user_id)
DELETE FROM members WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY club_id, user_id ORDER BY joined_at) as rn
    FROM members
  ) t WHERE rn > 1
);

-- Clean duplicate club_staff (same club_id + user_id + staff_role)
DELETE FROM club_staff WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY club_id, user_id, staff_role ORDER BY created_at) as rn
    FROM club_staff
  ) t WHERE rn > 1
);

-- Clean duplicate tour_players (same tour_id + player_id)
DELETE FROM tour_players WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tour_id, player_id ORDER BY created_at) as rn
    FROM tour_players
  ) t WHERE rn > 1
);

-- Clean duplicate contestants (same event_id + player_id)
DELETE FROM contestants WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, player_id ORDER BY created_at) as rn
    FROM contestants
  ) t WHERE rn > 1
);
