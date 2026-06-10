
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Status enum
CREATE TYPE public.novel_status AS ENUM ('ongoing', 'completed', 'hiatus');

-- Novels
CREATE TABLE public.novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  synopsis TEXT,
  cover_url TEXT,
  genre TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.novel_status NOT NULL DEFAULT 'ongoing',
  views BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX novels_author_idx ON public.novels(author_id);
CREATE INDEX novels_genre_idx ON public.novels(genre);
GRANT SELECT ON public.novels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.novels TO authenticated;
GRANT ALL ON public.novels TO service_role;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Novels viewable by everyone" ON public.novels FOR SELECT USING (true);
CREATE POLICY "Authors insert own novels" ON public.novels FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own novels" ON public.novels FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own novels" ON public.novels FOR DELETE USING (auth.uid() = author_id);

-- Chapters
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES public.novels ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (novel_id, chapter_number)
);
CREATE INDEX chapters_novel_idx ON public.chapters(novel_id, chapter_number);
GRANT SELECT ON public.chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published chapters viewable by everyone" ON public.chapters FOR SELECT
  USING (published OR EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.author_id = auth.uid()));
CREATE POLICY "Authors insert chapters" ON public.chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.author_id = auth.uid()));
CREATE POLICY "Authors update chapters" ON public.chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.author_id = auth.uid()));
CREATE POLICY "Authors delete chapters" ON public.chapters FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.author_id = auth.uid()));

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES public.novels ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (novel_id, user_id)
);
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON public.ratings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Library
CREATE TABLE public.library (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES public.novels ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, novel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library TO authenticated;
GRANT ALL ON public.library TO service_role;
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own library" ON public.library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own library" ON public.library FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reading progress
CREATE TABLE public.reading_progress (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES public.novels ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters ON DELETE SET NULL,
  chapter_number INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, novel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.reading_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER novels_touch BEFORE UPDATE ON public.novels FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER chapters_touch BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; n INT := 0;
BEGIN
  base := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'reader');
  base := regexp_replace(lower(base), '[^a-z0-9_]', '', 'g');
  IF length(base) < 3 THEN base := base || 'user'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, candidate, COALESCE(NEW.raw_user_meta_data->>'display_name', candidate));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
