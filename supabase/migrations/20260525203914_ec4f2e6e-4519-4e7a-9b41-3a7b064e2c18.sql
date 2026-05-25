update public.profiles
set business_website_url = null
where business_website_url is not null
  and (
    business_website_url ~* '^(https?://)?(www\.)?travidz\.com(/|$|\?)'
    or business_website_url ~* '^(https?://)?[^/]*\.lovable\.(app|dev)(/|$|\?)'
  );