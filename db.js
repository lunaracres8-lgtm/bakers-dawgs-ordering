const BD_URL = window.BD_CONFIG.SUPABASE_URL;
const BD_KEY = window.BD_CONFIG.SUPABASE_ANON_KEY;

function bdToken(){ return sessionStorage.getItem("bdAccessToken") || BD_KEY; }
function bdHeaders(){
 return {"apikey":BD_KEY,"Authorization":`Bearer ${bdToken()}`,"Content-Type":"application/json"};
}
async function bdRequest(url,options={}){
 const r=await fetch(url,options);
 if(!r.ok){ const e=new Error(await r.text()); e.status=r.status; throw e; }
 return r;
}

async function bdSignIn(email,password){
 const r=await fetch(`${BD_URL}/auth/v1/token?grant_type=password`,{
  method:"POST",headers:{"apikey":BD_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({email,password})
 });
 if(!r.ok) throw new Error(await r.text());
 const data=await r.json();
 if(!data.access_token) throw new Error("No access token returned.");
 sessionStorage.setItem("bdAccessToken",data.access_token);
 if(data.refresh_token) sessionStorage.setItem("bdRefreshToken",data.refresh_token);
 return data;
}
async function bdResetPassword(email){
 const headers={"apikey":BD_KEY,"Content-Type":"application/json"};
 const body=JSON.stringify({email});
 const redirectTo="https://lunaracres8-lgtm.github.io/bakers-dawgs-ordering/admin.html";
 let r=await fetch(`${BD_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,{method:"POST",headers,body});
 if(!r.ok){
  // Older WebViews and projects without an allow-listed redirect can reject redirect_to.
  // Retry using the Supabase project's configured Site URL instead.
  r=await fetch(`${BD_URL}/auth/v1/recover`,{method:"POST",headers,body});
 }
 if(!r.ok) throw new Error(await r.text());
 return true;
}

function bdRecoveryToken(){
 const p=new URLSearchParams(location.hash.replace(/^#/,""));
 return p.get("type")==="recovery" ? p.get("access_token") : null;
}
async function bdUpdatePassword(accessToken,password){
 const r=await fetch(`${BD_URL}/auth/v1/user`,{
  method:"PUT",
  headers:{"apikey":BD_KEY,"Authorization":`Bearer ${accessToken}`,"Content-Type":"application/json"},
  body:JSON.stringify({password})
 });
 if(!r.ok) throw new Error(await r.text());
 return r.json();
}

function bdSignOut(){
 sessionStorage.removeItem("bdAccessToken");
 sessionStorage.removeItem("bdRefreshToken");
}
async function bdCreateOrder(order){
 const r=await bdRequest(`${BD_URL}/rest/v1/orders`,{method:"POST",headers:{...bdHeaders(),"Prefer":"return=representation"},body:JSON.stringify(order)});
 return (await r.json())[0];
}
async function bdGetOrders(){
 const r=await bdRequest(`${BD_URL}/rest/v1/orders?select=*&order=created_at.desc`,{headers:bdHeaders()});
 return r.json();
}
async function bdUpdateOrder(id,changes){
 const r=await bdRequest(`${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:bdHeaders(),body:JSON.stringify(changes)});
}
async function bdDeleteOrder(id){
 const r=await bdRequest(`${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:bdHeaders()});
}

async function bdGetRestaurantSettings(){
 const r=await bdRequest(`${BD_URL}/rest/v1/restaurant_settings?id=eq.1&select=ordering_open,prep_minutes`,{headers:bdHeaders()});
 return (await r.json())[0]||{ordering_open:true,prep_minutes:20};
}
async function bdSetPrepMinutes(minutes){
 await bdRequest(`${BD_URL}/rest/v1/restaurant_settings?id=eq.1`,{method:"PATCH",headers:{...bdHeaders(),"Prefer":"return=minimal"},body:JSON.stringify({prep_minutes:minutes,updated_at:new Date().toISOString()})});
}
async function bdSetOrderingOpen(open){
 await bdRequest(`${BD_URL}/rest/v1/restaurant_settings?id=eq.1`,{
  method:"PATCH",headers:{...bdHeaders(),"Prefer":"return=minimal"},body:JSON.stringify({ordering_open:!!open,updated_at:new Date().toISOString()})
 });
}

async function bdGetMenuAvailability(){
 const r=await bdRequest(`${BD_URL}/rest/v1/menu_availability?select=item_name,available`,{headers:bdHeaders()});
 return r.json();
}
async function bdSetMenuAvailability(itemName,available){
 await bdRequest(`${BD_URL}/rest/v1/menu_availability?on_conflict=item_name`,{
  method:"POST",headers:{...bdHeaders(),"Prefer":"resolution=merge-duplicates,return=minimal"},
  body:JSON.stringify({item_name:itemName,available:!!available,updated_at:new Date().toISOString()})
 });
}
