-- ═══════════════════════════════════════════════════════════
-- course_tees seed — EGT courses (15 courses × 3 tees = 45 rows)
-- Safe to run multiple times (WHERE NOT EXISTS guard)
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Jagorawi Golf & Country Club (8a1f1533-c9d6-493a-abec-a18342a66caa)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'f6a57ec7-9ced-4e74-b82a-655aeadb21f8', '8a1f1533-c9d6-493a-abec-a18342a66caa', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a1f1533-c9d6-493a-abec-a18342a66caa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'f6a57ec7-9ced-4e74-b82a-655aeadb21f8');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'f2b7a38e-8613-4b75-998e-e242cd11f99d', '8a1f1533-c9d6-493a-abec-a18342a66caa', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a1f1533-c9d6-493a-abec-a18342a66caa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'f2b7a38e-8613-4b75-998e-e242cd11f99d');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'c66531cf-defa-4594-a20d-dc752bdf1a01', '8a1f1533-c9d6-493a-abec-a18342a66caa', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a1f1533-c9d6-493a-abec-a18342a66caa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'c66531cf-defa-4594-a20d-dc752bdf1a01');

-- Riverside Golf Club (52e29e79-1431-4035-a9e0-3650ac1a9efa)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '06e535f3-7a62-406c-b67f-adeea75283cb', '52e29e79-1431-4035-a9e0-3650ac1a9efa', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '52e29e79-1431-4035-a9e0-3650ac1a9efa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '06e535f3-7a62-406c-b67f-adeea75283cb');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '0f068d07-1590-49a3-a1f6-c22381b89ac9', '52e29e79-1431-4035-a9e0-3650ac1a9efa', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '52e29e79-1431-4035-a9e0-3650ac1a9efa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '0f068d07-1590-49a3-a1f6-c22381b89ac9');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '6e96a1c9-3269-4d78-859a-af5d99dbe4d0', '52e29e79-1431-4035-a9e0-3650ac1a9efa', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '52e29e79-1431-4035-a9e0-3650ac1a9efa')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '6e96a1c9-3269-4d78-859a-af5d99dbe4d0');

-- Permata Sentul Golf Club (833588f1-1b81-4964-98b0-358f270de073)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '97587d5a-2001-41f2-b541-57fd1f7e938c', '833588f1-1b81-4964-98b0-358f270de073', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '833588f1-1b81-4964-98b0-358f270de073')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '97587d5a-2001-41f2-b541-57fd1f7e938c');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '831dc3d5-0537-484f-8677-93e1afe446cd', '833588f1-1b81-4964-98b0-358f270de073', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '833588f1-1b81-4964-98b0-358f270de073')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '831dc3d5-0537-484f-8677-93e1afe446cd');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '7099d553-4adc-4be0-a7e6-5b6a8975725c', '833588f1-1b81-4964-98b0-358f270de073', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '833588f1-1b81-4964-98b0-358f270de073')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '7099d553-4adc-4be0-a7e6-5b6a8975725c');

-- Merapi View Golf Club (eae4ea7e-a09d-4313-a473-3b47bcc17db0)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '6a7b6bc3-73f3-4ccf-9fce-79a4787a9060', 'eae4ea7e-a09d-4313-a473-3b47bcc17db0', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'eae4ea7e-a09d-4313-a473-3b47bcc17db0')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '6a7b6bc3-73f3-4ccf-9fce-79a4787a9060');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '6cf40f95-4020-409f-922c-2546eb128943', 'eae4ea7e-a09d-4313-a473-3b47bcc17db0', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'eae4ea7e-a09d-4313-a473-3b47bcc17db0')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '6cf40f95-4020-409f-922c-2546eb128943');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '8f8362e9-b7b7-45a4-b06b-6976fb208545', 'eae4ea7e-a09d-4313-a473-3b47bcc17db0', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'eae4ea7e-a09d-4313-a473-3b47bcc17db0')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '8f8362e9-b7b7-45a4-b06b-6976fb208545');

-- Gunung Geulis Country Club (8a5b9ca5-5230-41aa-b51e-0965c4c223b6)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'bcb1312d-1d9a-444d-8a02-97d33f7e2dce', '8a5b9ca5-5230-41aa-b51e-0965c4c223b6', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a5b9ca5-5230-41aa-b51e-0965c4c223b6')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'bcb1312d-1d9a-444d-8a02-97d33f7e2dce');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '76333e5c-92bb-4d1f-8d0f-882f1a2e7436', '8a5b9ca5-5230-41aa-b51e-0965c4c223b6', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a5b9ca5-5230-41aa-b51e-0965c4c223b6')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '76333e5c-92bb-4d1f-8d0f-882f1a2e7436');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '398e85d6-412b-479a-900d-73e65dc09577', '8a5b9ca5-5230-41aa-b51e-0965c4c223b6', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '8a5b9ca5-5230-41aa-b51e-0965c4c223b6')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '398e85d6-412b-479a-900d-73e65dc09577');

-- Palm Hill Golf Club (aa17608c-7365-4165-9175-7db1fd018f55)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'd84dac2e-858b-4cb3-a663-c6890e0e5d24', 'aa17608c-7365-4165-9175-7db1fd018f55', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'aa17608c-7365-4165-9175-7db1fd018f55')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'd84dac2e-858b-4cb3-a663-c6890e0e5d24');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'ed84c8a7-d23e-4f84-85eb-83d810b21c6a', 'aa17608c-7365-4165-9175-7db1fd018f55', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'aa17608c-7365-4165-9175-7db1fd018f55')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'ed84c8a7-d23e-4f84-85eb-83d810b21c6a');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'eb9e5504-9f33-4235-9b0d-1315c0a0f7ea', 'aa17608c-7365-4165-9175-7db1fd018f55', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'aa17608c-7365-4165-9175-7db1fd018f55')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'eb9e5504-9f33-4235-9b0d-1315c0a0f7ea');

-- Sentul Highlands Golf Club (09f345bb-5046-44da-926b-5e0cf6e49489)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'ec5093ea-8810-4b98-828b-ee2839b505f0', '09f345bb-5046-44da-926b-5e0cf6e49489', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '09f345bb-5046-44da-926b-5e0cf6e49489')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'ec5093ea-8810-4b98-828b-ee2839b505f0');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '94ebf9a9-b857-4d19-8e98-f648f4e9cebf', '09f345bb-5046-44da-926b-5e0cf6e49489', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '09f345bb-5046-44da-926b-5e0cf6e49489')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '94ebf9a9-b857-4d19-8e98-f648f4e9cebf');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '61192127-126e-4e80-a5d4-d3118fc1418c', '09f345bb-5046-44da-926b-5e0cf6e49489', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '09f345bb-5046-44da-926b-5e0cf6e49489')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '61192127-126e-4e80-a5d4-d3118fc1418c');

-- Emeralda Golf Club (401e6bee-da01-4aa5-8054-777f216a41b5)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '22b52b47-1bb6-4e41-beab-e23dceb71ff5', '401e6bee-da01-4aa5-8054-777f216a41b5', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '401e6bee-da01-4aa5-8054-777f216a41b5')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '22b52b47-1bb6-4e41-beab-e23dceb71ff5');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '523bafb0-eb63-44ee-8ee0-bbb39d1bc567', '401e6bee-da01-4aa5-8054-777f216a41b5', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '401e6bee-da01-4aa5-8054-777f216a41b5')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '523bafb0-eb63-44ee-8ee0-bbb39d1bc567');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'd4e9d510-78a3-45e6-a250-4b3e37bfa3bc', '401e6bee-da01-4aa5-8054-777f216a41b5', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '401e6bee-da01-4aa5-8054-777f216a41b5')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'd4e9d510-78a3-45e6-a250-4b3e37bfa3bc');

-- Bukit Pelangi Golf Club (c50c2ff3-194b-49b5-a754-919f77d98d5b)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'edeafbd0-1b16-4947-a0e9-bbce2420ce25', 'c50c2ff3-194b-49b5-a754-919f77d98d5b', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'c50c2ff3-194b-49b5-a754-919f77d98d5b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'edeafbd0-1b16-4947-a0e9-bbce2420ce25');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'b58ac2b9-1325-4b00-b2a0-8cb16cffcff8', 'c50c2ff3-194b-49b5-a754-919f77d98d5b', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'c50c2ff3-194b-49b5-a754-919f77d98d5b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'b58ac2b9-1325-4b00-b2a0-8cb16cffcff8');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '7b1a867f-fe34-4fb4-8759-1b3320081929', 'c50c2ff3-194b-49b5-a754-919f77d98d5b', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'c50c2ff3-194b-49b5-a754-919f77d98d5b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '7b1a867f-fe34-4fb4-8759-1b3320081929');

-- Halim Golf Club (4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'd170697f-0303-4b15-9ac6-ffefd64a4169', '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'd170697f-0303-4b15-9ac6-ffefd64a4169');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '6fd42bec-5ba0-4c22-95e1-d3ec14d7cb22', '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '6fd42bec-5ba0-4c22-95e1-d3ec14d7cb22');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'b9e3a43a-22f1-4852-b8fb-425d6de9b927', '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '4944b82b-b9b1-4508-9fcf-ebb10c9dfe3d')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'b9e3a43a-22f1-4852-b8fb-425d6de9b927');

-- Bandung Giri Gahana Golf Club (43f19fbe-e824-4024-a0dc-f48285f189a3)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '46470ba0-8834-4f6a-8fa6-010904028226', '43f19fbe-e824-4024-a0dc-f48285f189a3', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '43f19fbe-e824-4024-a0dc-f48285f189a3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '46470ba0-8834-4f6a-8fa6-010904028226');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '281fd432-9378-41f9-acbb-81e4c0fb79fc', '43f19fbe-e824-4024-a0dc-f48285f189a3', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '43f19fbe-e824-4024-a0dc-f48285f189a3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '281fd432-9378-41f9-acbb-81e4c0fb79fc');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'cb198abf-cc59-412d-a93e-e96319391bf2', '43f19fbe-e824-4024-a0dc-f48285f189a3', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '43f19fbe-e824-4024-a0dc-f48285f189a3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'cb198abf-cc59-412d-a93e-e96319391bf2');

-- Royale Jakarta Golf Club (a4aa1581-0567-44d7-b9e6-b22817e7622b)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '2125c24b-42f4-405e-b07a-e4d38e452102', 'a4aa1581-0567-44d7-b9e6-b22817e7622b', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'a4aa1581-0567-44d7-b9e6-b22817e7622b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '2125c24b-42f4-405e-b07a-e4d38e452102');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'dfc3299d-40f3-4bbc-9e9f-97acf06d88ee', 'a4aa1581-0567-44d7-b9e6-b22817e7622b', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'a4aa1581-0567-44d7-b9e6-b22817e7622b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'dfc3299d-40f3-4bbc-9e9f-97acf06d88ee');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '7fda3aaa-8422-429c-800b-75e8cd981f3d', 'a4aa1581-0567-44d7-b9e6-b22817e7622b', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = 'a4aa1581-0567-44d7-b9e6-b22817e7622b')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '7fda3aaa-8422-429c-800b-75e8cd981f3d');

-- Greenfield Golf Course (0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '02051df7-55d0-40b4-a315-faff44786584', '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '02051df7-55d0-40b4-a315-faff44786584');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'e33a57ce-1afb-4a85-b9e4-26ff9756d082', '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'e33a57ce-1afb-4a85-b9e4-26ff9756d082');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '53374640-d2a9-45d6-a2ae-2154790cb8d7', '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '0f12a0b3-b937-47e5-9e4f-c5b0be1d8db9')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '53374640-d2a9-45d6-a2ae-2154790cb8d7');

-- Lakeside Golf Course (2f4b19b2-2eae-42d4-96f3-e3c51f17ed60)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'ec5eb081-de93-4942-94f9-35517d9f50cc', '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'ec5eb081-de93-4942-94f9-35517d9f50cc');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '12451b98-ded4-444c-8f4e-b4dbfd4d08b4', '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '12451b98-ded4-444c-8f4e-b4dbfd4d08b4');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'f3f35b28-3b24-4ef6-8b28-833bb7a48d6a', '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '2f4b19b2-2eae-42d4-96f3-e3c51f17ed60')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'f3f35b28-3b24-4ef6-8b28-833bb7a48d6a');

-- Sunrise Valley Golf Club (66c31d9d-6736-4988-bf20-1bb370876ab3)
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'cca6fef1-265a-47ef-8148-219efd2dece4', '66c31d9d-6736-4988-bf20-1bb370876ab3', 'White', '#FFFFFF', 72.4, 128
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '66c31d9d-6736-4988-bf20-1bb370876ab3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'cca6fef1-265a-47ef-8148-219efd2dece4');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT 'fdff562a-8d31-4150-816f-009268988cda', '66c31d9d-6736-4988-bf20-1bb370876ab3', 'Yellow', '#FFD700', 70.1, 124
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '66c31d9d-6736-4988-bf20-1bb370876ab3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = 'fdff562a-8d31-4150-816f-009268988cda');
INSERT INTO course_tees (id, course_id, tee_name, color, rating, slope)
  SELECT '8f31d375-0388-4f80-b4dd-102322bea672', '66c31d9d-6736-4988-bf20-1bb370876ab3', 'Red', '#DC2626', 70.8, 118
  WHERE EXISTS (SELECT 1 FROM courses WHERE id = '66c31d9d-6736-4988-bf20-1bb370876ab3')
  AND NOT EXISTS (SELECT 1 FROM course_tees WHERE id = '8f31d375-0388-4f80-b4dd-102322bea672');
