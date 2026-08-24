-- Retroactively grant existing tables (RLS still controls row-level access on top of this).
grant select on
  properties, monthly_targets, commission_rules, room_mappings, csv_uploads, reservations
to authenticated;

grant select, insert, update, delete on
  properties, monthly_targets, commission_rules, room_mappings, csv_uploads, reservations
to service_role;

-- Make every FUTURE table created by migrations (which run as the postgres role) inherit
-- these grants automatically, so later tasks don't need to repeat this.
alter default privileges for role postgres in schema public
  grant select on tables to authenticated;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
