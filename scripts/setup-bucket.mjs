const TOKEN = "sbp_ee6085de9211d704515a8441a4e8a1a20de6f647";
const REF = "hiyyrlifffrgjjnbkwps";
const API_URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function main() {
  const query = `
    insert into storage.buckets (id, name, public)
    values ('mopol-uploads', 'mopol-uploads', true)
    on conflict (id) do nothing;
  `;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  console.log("Bucket setup:", res.status, await res.text());
}

main();
