-- Clear business_website_url entries that point back to Travidz itself.
-- These create a redirect loop on the feed's "Book direct" CTA — the
-- 302 sends the user to our own homepage and lands them back on the same
-- video, making the button look broken.
update public.profiles
set business_website_url = null
where business_website_url is not null
  and (
    business_website_url ~* '^(https?://)?(www\.)?travidz\.com(/|$|\?)'
    or business_website_url ~* '^(https?://)?[^/]*\.lovable\.(app|dev)(/|$|\?)'
  );
