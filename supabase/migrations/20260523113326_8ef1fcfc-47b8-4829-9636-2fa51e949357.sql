
-- Extend notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'business_thread_message';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'business_invite_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'business_invite_declined';

-- Tracking columns on existing invites
ALTER TABLE public.business_invites
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_send_status text,
  ADD COLUMN IF NOT EXISTS last_send_error text;

-- Threads
CREATE TABLE IF NOT EXISTS public.business_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.business_invites(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_email text NOT NULL,
  business_name text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','declined','archived')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_threads_invite
  ON public.business_threads(invite_id) WHERE invite_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_threads_creator
  ON public.business_threads(creator_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_threads_business
  ON public.business_threads(business_id, last_message_at DESC) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_threads_creator_email
  ON public.business_threads(creator_id, business_email);

ALTER TABLE public.business_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators read own threads" ON public.business_threads
  FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "claimed businesses read own threads" ON public.business_threads
  FOR SELECT USING (business_id IS NOT NULL AND auth.uid() = business_id);
CREATE POLICY "creators update own threads" ON public.business_threads
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE TRIGGER trg_business_threads_updated
  BEFORE UPDATE ON public.business_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Messages (append-only)
CREATE TABLE IF NOT EXISTS public.business_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.business_threads(id) ON DELETE CASCADE,
  sender_kind text NOT NULL CHECK (sender_kind IN ('creator','business','system')),
  sender_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_email text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  kind text NOT NULL DEFAULT 'message'
    CHECK (kind IN ('message','invite_sent','invite_accepted','invite_declined','deal_attached')),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread
  ON public.business_thread_messages(thread_id, created_at);

ALTER TABLE public.business_thread_messages ENABLE ROW LEVEL SECURITY;

-- Read: creator or claimed business of the parent thread.
CREATE POLICY "thread participants read messages" ON public.business_thread_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_threads t
      WHERE t.id = thread_id
        AND (
          t.creator_id = auth.uid()
          OR (t.business_id IS NOT NULL AND t.business_id = auth.uid())
        )
    )
  );

-- Insert: creator may insert sender_kind='creator' on their thread.
CREATE POLICY "creator posts in own thread" ON public.business_thread_messages
  FOR INSERT WITH CHECK (
    sender_kind = 'creator'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_threads t
      WHERE t.id = thread_id AND t.creator_id = auth.uid()
    )
  );

-- Insert: claimed business may insert sender_kind='business' on their thread.
CREATE POLICY "business posts in own thread" ON public.business_thread_messages
  FOR INSERT WITH CHECK (
    sender_kind = 'business'
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.business_threads t
      WHERE t.id = thread_id AND t.business_id = auth.uid()
    )
  );

-- (No UPDATE / DELETE policies — append-only.)

-- SECURITY DEFINER RPC: load thread for an invite token (anon caller).
CREATE OR REPLACE FUNCTION public.get_thread_for_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_thread RECORD;
  v_creator RECORD;
  v_messages jsonb;
BEGIN
  SELECT id, creator_id, business_name, contact_email, status
    INTO v_invite
    FROM public.business_invites
   WHERE token = _token
   LIMIT 1;
  IF v_invite IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_thread FROM public.business_threads WHERE invite_id = v_invite.id LIMIT 1;
  IF v_thread IS NULL THEN
    RETURN jsonb_build_object('thread', NULL, 'messages', '[]'::jsonb);
  END IF;

  SELECT id, username, display_name, avatar_url INTO v_creator
    FROM public.profiles WHERE id = v_thread.creator_id LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'sender_kind', m.sender_kind,
      'sender_email', m.sender_email,
      'body', m.body,
      'kind', m.kind,
      'metadata', m.metadata,
      'created_at', m.created_at
    ) ORDER BY m.created_at), '[]'::jsonb)
    INTO v_messages
    FROM public.business_thread_messages m
   WHERE m.thread_id = v_thread.id;

  RETURN jsonb_build_object(
    'thread', jsonb_build_object(
      'id', v_thread.id,
      'invite_id', v_thread.invite_id,
      'status', v_thread.status,
      'business_name', v_thread.business_name,
      'business_email', v_thread.business_email,
      'subject', v_thread.subject,
      'created_at', v_thread.created_at
    ),
    'creator', CASE WHEN v_creator IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_creator.id,
      'username', v_creator.username,
      'display_name', v_creator.display_name,
      'avatar_url', v_creator.avatar_url
    ) END,
    'messages', v_messages
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_thread_for_invite(text) TO anon, authenticated;

-- SECURITY DEFINER RPC: post a reply from the anon business side using the invite token.
CREATE OR REPLACE FUNCTION public.post_thread_reply_with_token(
  _token text,
  _body text,
  _sender_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_thread_id uuid;
  v_message_id uuid;
  v_email text;
BEGIN
  IF _body IS NULL OR char_length(trim(_body)) = 0 OR char_length(_body) > 4000 THEN
    RAISE EXCEPTION 'Invalid message body';
  END IF;

  SELECT id, creator_id, business_name, contact_email
    INTO v_invite
    FROM public.business_invites
   WHERE token = _token
   LIMIT 1;
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Lookup or create the thread.
  SELECT id INTO v_thread_id FROM public.business_threads WHERE invite_id = v_invite.id LIMIT 1;
  IF v_thread_id IS NULL THEN
    INSERT INTO public.business_threads (invite_id, creator_id, business_email, business_name)
    VALUES (v_invite.id, v_invite.creator_id, lower(v_invite.contact_email), v_invite.business_name)
    RETURNING id INTO v_thread_id;
  END IF;

  v_email := COALESCE(lower(nullif(trim(_sender_email), '')), lower(v_invite.contact_email));

  INSERT INTO public.business_thread_messages
    (thread_id, sender_kind, sender_email, body, kind)
  VALUES
    (v_thread_id, 'business', v_email, _body, 'message')
  RETURNING id INTO v_message_id;

  UPDATE public.business_threads
     SET last_message_at = now(), updated_at = now()
   WHERE id = v_thread_id;

  -- Notify the creator.
  INSERT INTO public.notifications (user_id, actor_id, type)
  VALUES (v_invite.creator_id, v_invite.creator_id, 'business_thread_message');

  RETURN jsonb_build_object('thread_id', v_thread_id, 'message_id', v_message_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_thread_reply_with_token(text, text, text) TO anon, authenticated;
