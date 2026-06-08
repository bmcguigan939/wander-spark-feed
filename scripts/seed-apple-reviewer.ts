/**
 * Seeds the Apple App Review test account.
 *
 * Run ONCE against production:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/seed-apple-reviewer.ts
 *
 * Idempotent — re-running resets the password and re-seeds demo content.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const EMAIL = "apple-review@travidz.com";
const PASSWORD = "Travidz-Review-2026!LiR3ZKhb";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(): Promise<string> {
  // Try to find an existing user.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === EMAIL);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Apple Reviewer", full_name: "Apple Reviewer" },
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Apple Reviewer", full_name: "Apple Reviewer" },
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return data.user.id;
}

async function seedContent(userId: string) {
  // 1 saved collection
  const { data: existingCol } = await admin
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "My Italy trip")
    .maybeSingle();
  if (!existingCol) {
    await admin.from("collections").insert({
      user_id: userId,
      name: "My Italy trip",
      description: "Sample collection for App Review",
      is_public: false,
    });
  }

  // 1 in-progress itinerary
  const { data: existingItin } = await admin
    .from("itineraries")
    .select("id")
    .eq("user_id", userId)
    .eq("title", "Rome weekend (demo)")
    .maybeSingle();
  if (!existingItin) {
    await admin.from("itineraries").insert({
      user_id: userId,
      title: "Rome weekend (demo)",
      status: "draft",
    });
  }
  console.log("Demo content ensured.");
}

(async () => {
  const userId = await ensureUser();
  console.log(`Reviewer user ready: ${EMAIL} (id=${userId})`);
  await seedContent(userId);
  console.log("\nPaste these into App Store Connect → App Review Information:");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});