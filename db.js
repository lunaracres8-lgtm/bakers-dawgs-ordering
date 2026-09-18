const BD_URL = window.BD_CONFIG.SUPABASE_URL;
const BD_KEY = window.BD_CONFIG.SUPABASE_ANON_KEY;

const bdHeaders = {
  "apikey": BD_KEY,
  "Authorization": `Bearer ${BD_KEY}`,
  "Content-Type": "application/json"
};

async function bdCreateOrder(order) {
  const r = await fetch(`${BD_URL}/rest/v1/orders`, {
    method: "POST",
    headers: {...bdHeaders, "Prefer": "return=representation"},
    body: JSON.stringify(order)
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json())[0];
}

async function bdGetOrders() {
  const r = await fetch(
    `${BD_URL}/rest/v1/orders?select=*&order=created_at.desc`,
    {headers: bdHeaders}
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function bdUpdateOrder(id, changes) {
  const r = await fetch(
    `${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: bdHeaders,
      body: JSON.stringify(changes)
    }
  );
  if (!r.ok) throw new Error(await r.text());
}

async function bdDeleteOrder(id) {
  const r = await fetch(
    `${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: bdHeaders
    }
  );
  if (!r.ok) throw new Error(await r.text());
}
