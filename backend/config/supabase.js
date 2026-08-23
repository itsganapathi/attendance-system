const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Set these in your .env file."
  );
}

// Uses the service_role key (server-side only, never expose this to the frontend).
// It bypasses Row Level Security, which is fine here since all access control
// is enforced in our Express routes/middleware instead.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
