insert into commission_rules (source, villa_group, commission_pct) values
  ('BOOKING.COM', 'bracha', 0.18),
  ('BOOKING.COM', 'default', 0.173),
  ('EXPEDIA.COM', 'bracha', 0.15),
  ('EXPEDIA.COM', 'default', 0.15);

insert into properties (name, portfolio, is_bracha_group, pb1_enabled) values
  ('Bracha 1BD', 'aasha', true, true),
  ('Bracha 2BD', 'aasha', true, true),
  ('Bracha 3BD', 'aasha', true, true),
  ('Casa Amadeo B5B', 'aasha', false, true),
  ('Casa Amadeo A6', 'aasha', false, true),
  ('Casa Amani 1', 'aasha', false, true),
  ('Casa Amani 2', 'aasha', false, true),
  ('Casa Amani 3', 'aasha', false, true),
  ('Villa 128 E', 'aasha', false, true),
  ('Villa 128 F', 'aasha', false, true),
  ('Casa de Fiero 1', 'aasha', false, true),
  ('Casa de Fiero 2', 'aasha', false, true),
  ('Casa de Fiero 7', 'aasha', false, true),
  ('Villa Riso', 'aasha', false, true);
