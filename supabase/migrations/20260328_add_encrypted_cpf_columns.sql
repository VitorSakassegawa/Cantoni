alter table public.profiles
  add column if not exists cpf_encrypted text;

alter table public.profiles
  add column if not exists cpf_last4 text;
