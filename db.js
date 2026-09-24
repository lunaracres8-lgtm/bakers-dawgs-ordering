const BD_URL = window.BD_CONFIG.SUPABASE_URL;
const BD_KEY = window.BD_CONFIG.SUPABASE_ANON_KEY;

function bdToken(){ return sessionStorage.getItem("bdAccessToken") || BD_KEY; }
function bdHeaders(){
 return {"apikey":BD_KEY,"Authorization":`Bearer ${bdToken()}`,"Content-Type":"application/json"};
}

async function bdSignIn(email,password){
 const r=await fetch(`${BD_URL}/auth/v1/token?grant_type=password`,{
  method:"POST",headers:{"apikey":BD_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({email,password})
 });
 if(!r.ok) throw new Error(await r.text());
 const data=await r.json();
 sessionStorage.setItem("bdAccessToken",data.access_token);
 if(data.refresh_token) sessionStorage.setItem("bdRefreshToken",data.refresh_token);
 return data;
}
function bdSignOut(){
 sessionStorage.removeItem("bdAccessToken");
 sessionStorage.removeItem("bdRefreshToken");
}
async function bdCreateOrder(order){
 const r=await fetch(`${BD_URL}/rest/v1/orders`,{method:"POST",headers:{...bdHeaders(),"Prefer":"return=representation"},body:JSON.stringify(order)});
 if(!r.ok) throw new Error(await r.text()); return (await r.json())[0];
}
async function bdGetOrders(){
 const r=await fetch(`${BD_URL}/rest/v1/orders?select=*&order=created_at.desc`,{headers:bdHeaders()});
 if(!r.ok) throw new Error(await r.text()); return r.json();
}
async function bdUpdateOrder(id,changes){
 const r=await fetch(`${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:bdHeaders(),body:JSON.stringify(changes)});
 if(!r.ok) throw new Error(await r.text());
}
async function bdDeleteOrder(id){
 const r=await fetch(`${BD_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:bdHeaders()});
 if(!r.ok) throw new Error(await r.text());
}
