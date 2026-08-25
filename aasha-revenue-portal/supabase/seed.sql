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

insert into room_mappings (room_number, property_id)
select room_number, (select id from properties where name = property_name)
from (values
  ('101', 'Bracha 1BD'), ('102', 'Bracha 1BD'), ('103', 'Bracha 1BD'),
  ('104', 'Bracha 1BD'), ('105', 'Bracha 1BD'), ('106', 'Bracha 1BD'),
  ('107', 'Bracha 1BD'), ('108', 'Bracha 1BD'), ('109', 'Bracha 1BD'),
  ('110', 'Bracha 1BD'),
  ('201', 'Bracha 2BD'), ('202', 'Bracha 2BD'), ('203', 'Bracha 2BD'), ('204', 'Bracha 2BD'),
  ('300', 'Bracha 3BD'),
  ('AMDB5B', 'Casa Amadeo B5B'), ('AMDA6', 'Casa Amadeo A6'),
  ('AMN1', 'Casa Amani 1'), ('AMN2', 'Casa Amani 2'), ('AMN3', 'Casa Amani 3'),
  ('C128E', 'Villa 128 E'), ('C128F', 'Villa 128 F'),
  ('CDF1', 'Casa de Fiero 1'), ('CDF2', 'Casa de Fiero 2'), ('CDF7', 'Casa de Fiero 7'),
  ('RISO', 'Villa Riso')
) as mapping(room_number, property_name);
