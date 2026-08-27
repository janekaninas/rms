alter table csv_uploads alter column file_name drop not null;
alter table csv_uploads add column confirmed_empty boolean not null default false;

alter table csv_uploads add constraint confirmed_empty_consistency
  check (
    (confirmed_empty and file_name is null)
    or (not confirmed_empty and file_name is not null)
  );
