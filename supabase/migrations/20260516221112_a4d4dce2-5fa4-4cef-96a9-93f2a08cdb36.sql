-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns (1536 dims = OpenAI text-embedding-3-small via Lovable AI Gateway)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

-- ANN indexes (ivfflat cosine). lists=100 is fine for current volume.
CREATE INDEX IF NOT EXISTS videos_embedding_idx
  ON public.videos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS deals_embedding_idx
  ON public.deals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- match_videos: semantic search over public-readable videos
CREATE OR REPLACE FUNCTION public.match_videos(
  query_embedding vector(1536),
  match_count int DEFAULT 30,
  min_similarity float DEFAULT 0.0
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT v.id, 1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.videos v
  WHERE v.embedding IS NOT NULL
    AND v.is_hidden = false
    AND v.is_draft = false
    AND (v.status = 'ready' OR v.embed_mode = 'link_card')
    AND (v.scheduled_at IS NULL OR v.scheduled_at <= now())
    AND 1 - (v.embedding <=> query_embedding) >= min_similarity
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count
$$;

-- match_deals: semantic search over active+approved deals
CREATE OR REPLACE FUNCTION public.match_deals(
  query_embedding vector(1536),
  match_count int DEFAULT 30,
  min_similarity float DEFAULT 0.0,
  only_active boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.id, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.deals d
  WHERE d.embedding IS NOT NULL
    AND (NOT only_active OR (
      d.is_active = true
      AND d.status = 'approved'
      AND (d.starts_at IS NULL OR d.starts_at <= now())
      AND (d.ends_at IS NULL OR d.ends_at >= now())
    ))
    AND 1 - (d.embedding <=> query_embedding) >= min_similarity
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count
$$;