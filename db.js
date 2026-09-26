const BD_URL = window.BD_CONFIG.SUPABASE_URL;
const BD_KEY = window.BD_CONFIG.SUPABASE_ANON_KEY;
let bdSupabaseClient=null;
function bdGetSupabaseClient(){
 if(bdSupabaseClient) return bdSupabaseClient;
 if(!window.supabase?.createClient) throw new Error("Supabase client library is not loaded.");
 bdSupabaseClient=window.supabase.createClient(BD_URL,BD_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}
 });
 return bdSupabaseClient;
}
function bdStoreNativeSession(session){
 if(!session?.access_token) return;
 localStorage.setItem("bdAccessToken",session.access_token);
 if(session.refresh_token) localStorage.setItem("bdRefreshToken",session.refresh_token);
}
async function bdRegisterPasskey(){
 const client=bdGetSupabaseClient();
 const {data,error}=await client.auth.registerPasskey();
 if(error) throw error;
 return data;
}
async function bdSignInWithPasskey(){
 const client=bdGetSupabaseClient();
 const {data,error}=await client.auth.signInWithPasskey();
 if(error) throw error;
 bdStoreNativeSession(data?.session);
 return data;
}


function bdToken(){ return localStorage.getItem("bdAccessToken") || sessionStorage.getItem("bdAccessToken") || BD_KEY; }
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
 localStorage.setItem("bdAccessToken",data.access_token);
 if(data.refresh_token) localStorage.setItem("bdRefreshToken",data.refresh_token);
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
 const hash=new URLSearchParams(location.hash.replace(/^#/,""));
 const query=new URLSearchParams(location.search);
 const type=hash.get("type")||query.get("type");
 const token=hash.get("access_token")||query.get("access_token");
 return token || null;
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

async function bdRefreshSession(){
 const refreshToken=localStorage.getItem("bdRefreshToken") || sessionStorage.getItem("bdRefreshToken");
 if(!refreshToken) return false;
 const r=await fetch(`${BD_URL}/auth/v1/token?grant_type=refresh_token`,{
  method:"POST",headers:{"apikey":BD_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({refresh_token:refreshToken})
 });
 if(!r.ok){ bdSignOut(); return false; }
 const data=await r.json();
 if(!data.access_token) return false;
 localStorage.setItem("bdAccessToken",data.access_token);
 if(data.refresh_token) localStorage.setItem("bdRefreshToken",data.refresh_token);
 return true;
}
function bdHasSavedSession(){ return !!(localStorage.getItem("bdRefreshToken") || sessionStorage.getItem("bdRefreshToken")); }
function bdSignOut(){
 localStorage.removeItem("bdAccessToken");
 localStorage.removeItem("bdRefreshToken");
 sessionStorage.removeItem("bdAccessToken");
 sessionStorage.removeItem("bdRefreshToken");
}
async function bdCreateOrder(order){
 // Customer checkout must always use the public key, never a stale staff token
 // left in this browser from an earlier admin login.
 const headers={"apikey":BD_KEY,"Authorization":`Bearer ${BD_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"};
 await bdRequest(`${BD_URL}/rest/v1/orders`,{method:"POST",headers,body:JSON.stringify(order)});
 return {submitted:true};
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
