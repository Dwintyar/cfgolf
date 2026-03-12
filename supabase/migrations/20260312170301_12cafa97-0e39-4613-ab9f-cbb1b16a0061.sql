
DO $$
DECLARE
  i integer;
  uid uuid;
  first_names text[] := ARRAY['James','John','Robert','Michael','David','William','Richard','Joseph','Thomas','Charles','Chris','Daniel','Matt','Anthony','Mark','Steven','Paul','Andrew','Josh','Kevin','Brian','George','Edward','Ronald','Tim','Jason','Jeff','Ryan','Jacob','Gary','Nick','Sam','Alex','Ben','Luke','Nathan','Scott','Eric','Patrick','Travis','Dylan','Connor','Tyler','Ethan','Logan','Mason','Liam','Noah','Owen','Ian','Caleb','Max','Leo','Blake','Cole','Dean','Felix','Grant','Hank','Ivan','Jack','Karl','Lars','Milo','Omar','Pete','Quinn','Reed','Seth','Troy','Vince','Wade','Zane','Aaron','Adam','Alan','Brad','Carl','Dale','Earl','Finn','Glen','Hal','Jay','Ken','Lee','Ned','Ray','Roy','Sid','Ted','Tom','Vic','Walt','Yuri','Abel','Cody','Drew','Eli','Gus'];
  last_names text[] := ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson','Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez','Powell'];
  locations text[] := ARRAY['Jupiter, FL','Dallas, TX','Scottsdale, AZ','Las Vegas, NV','Orlando, FL','San Diego, CA','Austin, TX','Nashville, TN','Charlotte, NC','Denver, CO','Phoenix, AZ','Tampa, FL','Atlanta, GA','Seattle, WA','Portland, OR','Miami, FL','Chicago, IL','Boston, MA','Honolulu, HI','Savannah, GA'];
  club_ids uuid[] := ARRAY['b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003']::uuid[];
  flight_ids uuid[] := ARRAY['e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003']::uuid[];
  hcp integer;
  club_idx integer;
  flight_id uuid;
  fname text;
  lname text;
  email_addr text;
  contestant_id uuid;
  round_id uuid;
  gross integer;
  net integer;
BEGIN
  FOR i IN 1..500 LOOP
    uid := gen_random_uuid();
    fname := first_names[1 + (i % array_length(first_names, 1))];
    lname := last_names[1 + (i % array_length(last_names, 1))];
    email_addr := lower(fname) || '.' || lower(lname) || '.' || i || '@test.com';
    hcp := (random() * 36)::integer;
    club_idx := 1 + (i % 3);

    -- Determine flight
    IF hcp <= 10 THEN flight_id := flight_ids[1];
    ELSIF hcp <= 18 THEN flight_id := flight_ids[2];
    ELSE flight_id := flight_ids[3];
    END IF;

    -- Insert auth user
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
    VALUES (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email_addr, crypt('password123', gen_salt('bf')), now(), jsonb_build_object('full_name', fname || ' ' || lname), now(), now(), '', '')
    ON CONFLICT (id) DO NOTHING;

    -- Insert identity
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (uid, uid, email_addr, jsonb_build_object('sub', uid, 'email', email_addr), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;

    -- Update profile (created by trigger)
    UPDATE public.profiles SET handicap = hcp, location = locations[1 + (i % array_length(locations, 1))] WHERE id = uid;

    -- Add as club member
    INSERT INTO public.members (club_id, user_id, role) VALUES (club_ids[club_idx], uid, 'member')
    ON CONFLICT DO NOTHING;

    -- Add as tour player
    INSERT INTO public.tour_players (tour_id, club_id, player_id, status)
    VALUES ('d0000000-0000-0000-0000-000000000001', club_ids[club_idx], uid, 'active');

    -- Add as contestant for the event
    contestant_id := gen_random_uuid();
    INSERT INTO public.contestants (id, event_id, player_id, hcp, status, flight_id)
    VALUES (contestant_id, 'aa000000-0000-0000-0000-000000000001', uid, hcp, 'competitor', flight_id);

    -- Create round
    round_id := gen_random_uuid();
    INSERT INTO public.rounds (id, course_id, created_by, status)
    VALUES (round_id, 'c0000000-0000-0000-0000-000000000001', uid, 'completed');

    -- Create scorecard with realistic scores
    gross := 68 + (random() * 30)::integer; -- 68 to 98
    net := gross - hcp;
    IF net < 60 THEN net := 60; END IF;

    INSERT INTO public.scorecards (round_id, player_id, course_id, gross_score, net_score, total_score)
    VALUES (round_id, uid, 'c0000000-0000-0000-0000-000000000001', gross, net, gross);

  END LOOP;
END;
$$;
