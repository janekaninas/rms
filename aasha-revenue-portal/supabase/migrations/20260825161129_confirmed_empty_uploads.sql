alter table csv_uploads alter column file_name drop not null;
alter table csv_uploads add column confirmed_empty boolean not null default false;
