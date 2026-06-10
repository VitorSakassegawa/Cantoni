-- Storage bucket that caches synthesized placement-test listening audio.
--
-- Files are content-addressed (<sha256-of-script>.wav) and written by the
-- server using the service-role key (see lib/placement-audio-cache.ts), so no
-- per-user RLS policies are required for writes. The audio is non-sensitive
-- generic CEFR listening content, so the bucket is public-read to allow simple
-- CDN-cached delivery if we ever switch from base64 to public URLs.

insert into storage.buckets (id, name, public)
values ('placement-audio', 'placement-audio', true)
on conflict (id) do nothing;

-- Public read of cached clips (writes go through the service role, which
-- bypasses RLS — no insert/update policy needed).
drop policy if exists "placement_audio_public_read" on storage.objects;
create policy "placement_audio_public_read"
  on storage.objects for select
  using (bucket_id = 'placement-audio');
