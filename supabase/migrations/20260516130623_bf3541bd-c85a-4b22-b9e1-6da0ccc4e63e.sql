
-- Music library
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  audio_url text NOT NULL,
  cover_url text,
  duration_sec numeric,
  source text,
  license text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_tracks public read"
ON public.music_tracks FOR SELECT
USING (is_active = true);

CREATE POLICY "music_tracks admin insert"
ON public.music_tracks FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "music_tracks admin update"
ON public.music_tracks FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "music_tracks admin delete"
ON public.music_tracks FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Link videos to a track
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS music_track_id uuid REFERENCES public.music_tracks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS videos_music_track_idx ON public.videos(music_track_id) WHERE music_track_id IS NOT NULL;

-- Seed a starter library (SoundHelix demo tracks — royalty-free for testing)
INSERT INTO public.music_tracks (title, artist, audio_url, cover_url, duration_sec, source, license) VALUES
  ('Golden Hour Drift', 'Helio Sun', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', NULL, 372, 'soundhelix', 'demo'),
  ('Tide Pool', 'Marin Echo', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', NULL, 425, 'soundhelix', 'demo'),
  ('Night Market', 'Lumen', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', NULL, 412, 'soundhelix', 'demo'),
  ('Cliffside', 'Atla', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', NULL, 376, 'soundhelix', 'demo'),
  ('Slow Train', 'Pine & Salt', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', NULL, 357, 'soundhelix', 'demo'),
  ('Citrus Air', 'Mara Vista', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', NULL, 354, 'soundhelix', 'demo'),
  ('Dune Walk', 'Halcyon', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', NULL, 410, 'soundhelix', 'demo'),
  ('Postcard', 'June Bloom', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', NULL, 365, 'soundhelix', 'demo');
