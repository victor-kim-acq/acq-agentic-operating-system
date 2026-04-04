import { sql } from "@vercel/postgres";

async function migrate() {
  console.log("Running Skool data migrations...");

  // Bridge table between Skool and HubSpot
  await sql`
    CREATE TABLE IF NOT EXISTS skool_members (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      tier TEXT,
      bio TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      ltv DOUBLE PRECISION DEFAULT 0,
      join_date TIMESTAMPTZ,
      onboarding_answers JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  Created skool_members table");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_members_email ON skool_members(email)
  `;
  console.log("  Created index on skool_members.email");

  // Posts from Skool community
  await sql`
    CREATE TABLE IF NOT EXISTS skool_posts (
      post_id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      category TEXT,
      upvotes INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      author_id TEXT REFERENCES skool_members(user_id),
      created_at TIMESTAMPTZ,
      semantic_topic TEXT,
      semantic_role TEXT,
      classified_at TIMESTAMPTZ
    )
  `;
  console.log("  Created skool_posts table");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_posts_author_id ON skool_posts(author_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_posts_semantic_topic ON skool_posts(semantic_topic)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_posts_unclassified ON skool_posts(post_id) WHERE semantic_topic IS NULL
  `;
  console.log("  Created indexes on skool_posts");

  // Comments on Skool posts
  await sql`
    CREATE TABLE IF NOT EXISTS skool_comments (
      comment_id TEXT PRIMARY KEY,
      post_id TEXT REFERENCES skool_posts(post_id),
      parent_comment_id TEXT REFERENCES skool_comments(comment_id),
      content TEXT,
      upvotes INTEGER DEFAULT 0,
      author_id TEXT REFERENCES skool_members(user_id),
      created_at TIMESTAMPTZ,
      semantic_topic TEXT,
      semantic_role TEXT,
      classified_at TIMESTAMPTZ
    )
  `;
  console.log("  Created skool_comments table");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_comments_post_id ON skool_comments(post_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_comments_author_id ON skool_comments(author_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_skool_comments_unclassified ON skool_comments(comment_id) WHERE semantic_topic IS NULL
  `;
  console.log("  Created indexes on skool_comments");

  console.log("Skool data migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
