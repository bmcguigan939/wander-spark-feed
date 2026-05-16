CREATE OR REPLACE FUNCTION public.videos_update_search_tsv()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.destination,'') || ' ' || coalesce(NEW.country,'') || ' ' || coalesce(NEW.city,'')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.activity_tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.transcript,'')), 'D');
  RETURN NEW;
END $function$;

UPDATE public.videos SET id = id WHERE transcript IS NOT NULL;