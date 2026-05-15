
CREATE TYPE public.app_role AS ENUM ('traveller', 'creator', 'business', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1),
             'user' || substr(NEW.id::text, 1, 8)),
    '[^a-z0-9_]', '', 'g'));
  IF length(base_username) < 3 THEN base_username := 'user' || substr(NEW.id::text, 1, 8); END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_username,
          COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_username),
          NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'traveller');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  thumbnail_url TEXT,
  duration_sec NUMERIC,
  destination TEXT,
  country TEXT,
  city TEXT,
  activity_tags TEXT[] NOT NULL DEFAULT '{}',
  budget_tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  like_count INT NOT NULL DEFAULT 0,
  save_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  search_tsv tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.videos (status, created_at DESC);
CREATE INDEX ON public.videos (creator_id, created_at DESC);
CREATE INDEX videos_search_idx ON public.videos USING GIN (search_tsv);

CREATE OR REPLACE FUNCTION public.videos_update_search_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.destination,'') || ' ' || coalesce(NEW.country,'') || ' ' || coalesce(NEW.city,'')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.activity_tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'C');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_videos_search_tsv BEFORE INSERT OR UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.videos_update_search_tsv();

CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, creator_id),
  CHECK (follower_id <> creator_id)
);

CREATE TABLE public.likes (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE public.saves (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watch_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.video_views (video_id, created_at DESC);

CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  cover_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.collections (owner_id, created_at DESC);

CREATE TABLE public.collection_items (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, video_id)
);

CREATE OR REPLACE FUNCTION public.bump_video_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_likes_count AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.bump_video_like_count();

CREATE OR REPLACE FUNCTION public.bump_video_save_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.videos SET save_count = save_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.videos SET save_count = GREATEST(0, save_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_saves_count AFTER INSERT OR DELETE ON public.saves
FOR EACH ROW EXECUTE FUNCTION public.bump_video_save_count();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "user can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "videos public read ready" ON public.videos FOR SELECT USING (status = 'ready' OR creator_id = auth.uid());
CREATE POLICY "creator inserts own video" ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND public.has_role(auth.uid(), 'creator'));
CREATE POLICY "creator updates own video" ON public.videos FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "creator deletes own video" ON public.videos FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "follows public read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "user inserts own follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "user deletes own follow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "likes self read" ON public.likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user inserts own like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own like" ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "saves self read" ON public.saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user inserts own save" ON public.saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own save" ON public.saves FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "anyone inserts own view" ON public.video_views FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "collections public read" ON public.collections FOR SELECT
  USING (visibility = 'public' OR auth.uid() = owner_id);
CREATE POLICY "collections owner insert" ON public.collections FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "collections owner update" ON public.collections FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "collections owner delete" ON public.collections FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "collection_items read" ON public.collection_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id
          AND (c.visibility = 'public' OR c.owner_id = auth.uid()))
);
CREATE POLICY "collection_items owner insert" ON public.collection_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);
CREATE POLICY "collection_items owner delete" ON public.collection_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars user upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
