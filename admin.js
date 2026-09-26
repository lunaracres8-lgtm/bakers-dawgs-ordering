const statuses=["New","Accepted","Cooking","Ready","Completed"];
let currentFilter="all";
let hideCompleted=true;
let knownOrderIds=new Set();
let firstOrderLoad=true;
let orderingOpen=null;
let prepMinutes=20;
let menuAvailability={};
let soundEnabled=localStorage.getItem("bdSoundEnabled")!=="false";
const adminMenuItems=["Carolina Classic Hot Dawg","Sauerkraut & Mustard Dawg","Chili & Cheez Dawg","Chili, Onion & Mustard Dawg","Sweet Relish & Mustard Dawg","Loaded Hot Dawg","Brat / Bratwurst","Classic Plain Smoked Sausage","Cheddar Cheez Smoked Sausage","Jalapeño Smoked Sausage","The Perfect Brat","Grilled Bologna on Toast (cut #5)","Grilled Cheez Quesadilla","Bottled Drink / Soda","Bottled Water","Sweet Tea with Ice","Lemonade Sweet Tea with Ice","Chips","German Chocolate Cake","3 Milks Cake"];

function esc(v=""){
 return String(v).replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",
  '"':"&quot;","'":"&#39;"
 }[c]));
}

function updateClock(){
 const el=document.querySelector("#clock");
 if(el) el.textContent=new Date().toLocaleString([], {weekday:"short",hour:"numeric",minute:"2-digit"});
}

function isLate(o){
 if(o.status==="Completed"||!o.pickup_time) return false;
 const [h,m]=String(o.pickup_time).split(":").map(Number);
 if(Number.isNaN(h)||Number.isNaN(m)) return false;
 const due=new Date(o.created_at); due.setHours(h,m,0,0);
 return Date.now()>due.getTime();
}

function nextStatus(status){
 const i=statuses.indexOf(status);
 return i>=0&&i<statuses.length-1?statuses[i+1]:null;
}

function statusActionLabel(status){
 return ({New:"ACCEPT ORDER",Accepted:"START COOKING",Cooking:"MARK READY",Ready:"COMPLETE ORDER"})[status]||"";
}

function waitTime(created){
 const mins=Math.max(0,Math.floor((Date.now()-new Date(created).getTime())/60000));
 return mins<1?"just now":mins===1?"1 min ago":`${mins} mins ago`;
}

function toggleSound(){
 soundEnabled=!soundEnabled;
 localStorage.setItem("bdSoundEnabled",String(soundEnabled));
 const btn=document.querySelector("#soundToggle");
 if(btn) btn.textContent=soundEnabled?"🔔 Alerts On":"🔕 Alerts Off";
 if(soundEnabled) playOrderAlert();
}

function playOrderAlert(){
 if(!soundEnabled) return;
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const master=ctx.createGain();
  master.gain.value=.45;
  master.connect(ctx.destination);
  const ring=(frequency,start,duration)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="sine"; osc.frequency.value=frequency;
   gain.gain.setValueAtTime(0,ctx.currentTime+start);
   gain.gain.linearRampToValueAtTime(.8,ctx.currentTime+start+.02);
   gain.gain.setValueAtTime(.8,ctx.currentTime+start+duration-.04);
   gain.gain.linearRampToValueAtTime(0,ctx.currentTime+start+duration);
   osc.connect(gain); gain.connect(master);
   osc.start(ctx.currentTime+start); osc.stop(ctx.currentTime+start+duration+.02);
  };
  ring(659,0,.18); ring(784,.20,.18); ring(988,.40,.28);
  setTimeout(()=>ctx.close(),1000);
 }catch(e){}
 if(navigator.vibrate) navigator.vibrate([180,80,260]);
}


// Native Supabase passkeys: the passkey itself creates the authenticated session.
async function enrollBiometric(){
 if(!window.PublicKeyCredential){ alert("This device/browser does not support passkeys."); return; }
 if(!bdHasSavedSession()){ alert("Sign in with the staff password once before adding this device's fingerprint/passkey."); return; }
 try{
  if(!(await bdRefreshSession())) throw new Error("Staff session expired");
  await bdRegisterPasskey();
  localStorage.setItem("bdNativePasskeyEnrolled","1");
  alert("Fingerprint/passkey registered with Baker's Dawgs. It can now sign you in after a restart.");
 }catch(e){
  console.error("Passkey registration failed",e);
  alert("Could not register the fingerprint/passkey: "+(e?.message||"Please try again."));
 }
}

async function biometricUnlock(){
 if(!window.PublicKeyCredential){ alert("This device/browser does not support passkeys."); return; }
 try{
  const data=await bdSignInWithPasskey();
  if(!data?.session) throw new Error("No authenticated session was returned.");
  sessionStorage.removeItem("bdReturnToAdmin");
  showBoard();
 }catch(e){
  console.error("Passkey sign-in failed",e);
  if(e?.name!=="NotAllowedError") alert("Fingerprint/passkey sign-in failed: "+(e?.message||"Please try again."));
 }
}

async function login(){
 const email=document.querySelector("#email").value.trim();
 const password=document.querySelector("#password").value;
 if(!email||!password){ alert("Enter staff email and password."); return; }
 console.log("Admin sign-in tapped", email);
 try{
  await bdSignIn(email,password);
  showBoard();
  if(!localStorage.getItem("bdNativePasskeyEnrolled") && window.PublicKeyCredential){
   setTimeout(()=>{ if(confirm("Add this device fingerprint/passkey so you can sign in after a restart?")) enrollBiometric(); },300);
  }
 }catch(e){ alert("Sign-in failed. Check the staff email and password."); }
}

async function forgotPassword(){
 const email=document.querySelector("#email").value.trim();
 if(!email){ alert("Enter the staff email address first."); return; }
 console.log("Password reset tapped", email);
 try{ await bdResetPassword(email); alert("Password reset email sent. Check the staff email inbox and follow the reset link."); }
 catch(e){ console.error("Password reset failed",e); alert("Password reset failed: "+(e?.message||"Please try again.")); }
}

function logout(){
 bdSignOut();
 location.reload();
}

let adminLockTimer=null;
const ADMIN_AUTO_LOCK_MS=5*60*1000;
const DEFAULT_STAFF_PIN_HASH="f3e055913a0b1eb0f07317896f9a1bc466b9a50db85a7f882f3ffde9ffb23aca";
let pinFailures=0, pinBlockedUntil=0;
async function hashPin(pin){
 const bytes=new TextEncoder().encode(pin);
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function unlockWithPin(){
 const input=document.querySelector("#staffPin"), msg=document.querySelector("#pinMessage");
 if(Date.now()<pinBlockedUntil){if(msg)msg.textContent="Too many attempts. Try again in a moment.";return;}
 const expected=localStorage.getItem("bdStaffPinHash")||DEFAULT_STAFF_PIN_HASH;
 if(await hashPin((input?.value||"").trim())===expected){
  pinFailures=0;if(input)input.value="";document.querySelector("#pinGate")?.classList.add("hidden");showBoard();return;
 }
 pinFailures++;if(input)input.value="";
 if(pinFailures>=5){pinBlockedUntil=Date.now()+30000;pinFailures=0;}
 if(msg)msg.textContent=pinBlockedUntil>Date.now()?"Too many attempts. Locked for 30 seconds.":"Incorrect PIN. Try again.";
}
function showPinGate(){
 const login=document.querySelector("#login"),recovery=document.querySelector("#recovery"),board=document.querySelector("#app"),gate=document.querySelector("#pinGate");
 if(login)login.style.display="none";if(recovery)recovery.style.display="none";
 if(board){board.classList.add("hidden");board.style.display="none";}
 if(gate){gate.classList.remove("hidden");gate.style.display="grid";}
 setTimeout(()=>document.querySelector("#staffPin")?.focus(),50);
}

function armAdminAutoLock(){
 clearTimeout(adminLockTimer);
 if(document.querySelector("#app")?.classList.contains("hidden")) return;
 adminLockTimer=setTimeout(lockAdminScreen,ADMIN_AUTO_LOCK_MS);
}
function lockAdminScreen(){
 clearTimeout(adminLockTimer);
 document.body.dataset.adminLocked="true";
 if(bdHasSavedSession()){showPinGate();return;}
 location.reload();
}
["pointerdown","keydown","touchstart","scroll"].forEach(evt=>{
 document.addEventListener(evt,()=>{
  if(document.body.dataset.adminLocked!=="true") armAdminAutoLock();
 },{passive:true});
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden && !document.querySelector("#app")?.classList.contains("hidden")) lockAdminScreen();
});

function showBoard(){
 const loginBox=document.querySelector("#login");
 const recoveryBox=document.querySelector("#recovery");
 const board=document.querySelector("#app");

 if(loginBox) loginBox.style.display="none";
 if(recoveryBox) recoveryBox.style.display="none";
 if(board){ board.classList.remove("hidden"); board.style.display="block"; }
 document.body.dataset.adminLocked="false";
 armAdminAutoLock();
 const soundBtn=document.querySelector("#soundToggle");
 if(soundBtn) soundBtn.textContent=soundEnabled?"🔔 Alerts On":"🔕 Alerts Off";

 loadOrders();
 loadRestaurantControls();
 loadMenuAvailability();
}

async function loadRestaurantControls(){
 try{
  const settings=await bdGetRestaurantSettings();
  orderingOpen=settings?.ordering_open!==false;
  prepMinutes=Number(settings?.prep_minutes)||20;
  const prep=document.querySelector("#prepMinutes"); if(prep) prep.value=String(prepMinutes);
  const status=document.querySelector("#orderingStatus");
  const btn=document.querySelector("#orderingToggle");
  if(status) status.textContent=orderingOpen?"Customers can place pickup orders":"Ordering is paused";
  if(btn){ btn.disabled=false; btn.textContent=orderingOpen?"PAUSE ORDERS":"OPEN ORDERS"; btn.classList.toggle("closed",!orderingOpen); }
 }catch(e){
  const status=document.querySelector("#orderingStatus");
  if(status) status.textContent="Controls unavailable";
 }
}

async function loadMenuAvailability(){
 try{
  const rows=await bdGetMenuAvailability();
  menuAvailability=Object.fromEntries((rows||[]).map(r=>[r.item_name,r.available!==false]));
  const box=document.querySelector("#menuAvailabilityControls");
  if(box) box.innerHTML=adminMenuItems.map(name=>{
   const available=menuAvailability[name]!==false;
   return `<button type="button" class="${available?"available":"soldout"}" onclick="toggleMenuItem(decodeURIComponent(\'${encodeURIComponent(name)}\'))"><span>${esc(name)}</span><b>${available?"AVAILABLE":"SOLD OUT"}</b></button>`;
  }).join("");
 }catch(e){
  const box=document.querySelector("#menuAvailabilityControls");
  if(box) box.textContent="Menu controls unavailable.";
 }
}

async function toggleMenuItem(name){
 const available=menuAvailability[name]!==false;
 try{
  await bdSetMenuAvailability(name,!available);
  await loadMenuAvailability();
 }catch(e){ alert("Could not update that menu item."); }
}

async function changePrepMinutes(value){
 const minutes=Number(value);
 if(![15,20,30,45,60].includes(minutes)) return;
 try{ await bdSetPrepMinutes(minutes); prepMinutes=minutes; }
 catch(e){ alert("Could not update pickup lead time."); await loadRestaurantControls(); }
}

async function toggleOrdering(){
 if(orderingOpen===null) return;
 const btn=document.querySelector("#orderingToggle");
 if(btn) btn.disabled=true;
 try{
  await bdSetOrderingOpen(!orderingOpen);
  await loadRestaurantControls();
 }catch(e){
  if(btn) btn.disabled=false;
  alert("Could not change online ordering. Check that restaurant controls are installed in Supabase.");
 }
}

async function loadOrders(){
 const list=document.querySelector("#orders");

 try{
  const orders=await bdGetOrders();
  window.bdCurrentOrders=orders;
  const newIds=orders.filter(o=>o.status==="New"&&!knownOrderIds.has(o.id)).map(o=>o.id);
  if(!firstOrderLoad&&newIds.length){ playOrderAlert(); }
  knownOrderIds=new Set(orders.map(o=>o.id));
  firstOrderLoad=false;

  const today=new Date().toDateString();
  const todays=orders.filter(o=>new Date(o.created_at).toDateString()===today);
  const sales=todays.filter(o=>o.status==="Completed").reduce((s,o)=>s+Number(o.total||0),0);
  const completed=todays.filter(o=>o.status==="Completed").length;
  const salesEl=document.querySelector("#salesToday"),ordersEl=document.querySelector("#ordersToday"),avgEl=document.querySelector("#avgTicket");
  if(salesEl) salesEl.textContent=`${sales.toFixed(2)}`;
  if(ordersEl) ordersEl.textContent=todays.length;
  if(avgEl) avgEl.textContent=completed?`${(sales/completed).toFixed(2)}`:"$0.00";

  const newCount=document.querySelector("#newCount");
  const readyCount=document.querySelector("#readyCount");
  if(newCount) newCount.textContent=orders.filter(o=>o.status==="New").length;
  if(readyCount) readyCount.textContent=orders.filter(o=>o.status==="Ready").length;

  const count=document.querySelector("#openCount");
  if(count){
   count.textContent=orders.filter(o=>o.status!=="Completed").length;
  }

  if(!orders.length){
   list.innerHTML="<p>No orders yet.</p>";
   return;
  }

  const visibleOrders=(currentFilter==="all"?orders:orders.filter(o=>o.status===currentFilter))
    .filter(o=>!hideCompleted||o.status!=="Completed");

  list.innerHTML=visibleOrders.map(o=>`
   <article class="order ${o.status==="New"?"new":""} ${isLate(o)?"late":""}">
    <div class="orderTop">
     <div>
      <h2>${esc(o.customer_name)}</h2>
      <div><a class="phoneLink" href="tel:${esc(String(o.phone||'').replace(/[^+\d]/g,''))}">${esc(o.phone)}</a> • Pickup: ${esc(o.pickup_time)} • ${waitTime(o.created_at)}</div>
     </div>
     <strong>$${Number(o.total).toFixed(2)}</strong>
    </div>

    <div class="status status-${esc(o.status)}">
     ${esc(o.status)}
    </div>

    <div class="items">
     ${(o.items||[]).map(i=>`
      <div class="orderItem">
       <b>${esc(i.name)}</b>
       ${i.options?`<small>${esc(i.options)}</small>`:""}
       ${i.notes?`<small>Note: ${esc(i.notes)}</small>`:""}
       <span>$${Number(i.price||0).toFixed(2)}</span>
      </div>
     `).join("")}
    </div>

    ${o.notes?`<p><b>Order note:</b> ${esc(o.notes)}</p>`:""}

    <div class="speechActions"><button type="button" onclick="speakKitchenOrder(\'${o.id}\')">🔊 READ ORDER</button>${(o.items||[]).map((i,n)=>`<button type="button" onclick="speakKitchenOrder(\'${o.id}\',${n})">Read Item ${n+1}</button>`).join("")}</div>

    ${typeof bdPaymentSelector==="function"?bdPaymentSelector(o):""}\n    ${nextStatus(o.status)?`<button class="nextStatus" onclick="changeStatus('${o.id}','${nextStatus(o.status)}')">${statusActionLabel(o.status)}</button>`:""}

    <select onchange="changeStatus('${o.id}',this.value)">
     ${statuses.map(s=>
      `<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`
     ).join("")}
    </select>

    <button onclick="deleteOrder('${o.id}')">Delete Order</button>
   </article>
  `).join("");

 }catch(e){
  if(e.status===401||e.status===403){
   bdSignOut();
   alert("Your staff session expired. Please sign in again.");
   location.reload();
   return;
  }
  list.innerHTML="<p>Could not load orders. Check the connection.</p>";
 }
}


let lastSpokenOrderId=null;
function orderSpeechText(o, itemIndex=null){
 const items=Array.isArray(o.items)?o.items:[];
 const chosen=itemIndex===null?items:(items[itemIndex]?[items[itemIndex]]:[]);
 const lines=chosen.map((i,n)=>{
  const label=itemIndex===null?`Item ${n+1}`:`Item ${itemIndex+1}`;
  return [label, i.name, i.options?`with ${i.options}`:"", i.notes?`Note: ${i.notes}`:""].filter(Boolean).join(". ");
 });
 return [itemIndex===null?`Order for ${o.customer_name||"customer"}.`:"", ...lines, itemIndex===null&&o.notes?`Order note: ${o.notes}`:""].filter(Boolean).join(". ");
}
function bestKitchenVoice(){
 const voices=speechSynthesis.getVoices();
 const english=voices.filter(v=>/^en(-|_)/i.test(v.lang||""));
 const naturalHints=/natural|neural|enhanced|premium|google|samsung|microsoft|siri/i;
 return english.find(v=>naturalHints.test(v.name||""))||english.find(v=>/en-US/i.test(v.lang||""))||english[0]||voices[0]||null;
}
function speakKitchenOrder(id,itemIndex=null){
 const o=(window.bdCurrentOrders||[]).find(x=>String(x.id)===String(id));
 if(!o){alert("Order is no longer on the board.");return;}
 if(!("speechSynthesis" in window)){alert("This device does not support spoken order read-back.");return;}
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(orderSpeechText(o,itemIndex));
 const voice=bestKitchenVoice(); if(voice){u.voice=voice;u.lang=voice.lang||"en-US";}
 u.rate=.88; u.pitch=1; u.volume=1;
 speechSynthesis.speak(u);
 lastSpokenOrderId=o.id;
}
function repeatLastOrder(){
 if(!lastSpokenOrderId){alert("Tap Read Order on an order first.");return;}
 speakKitchenOrder(lastSpokenOrderId);
}
function stopOrderSpeech(){ if("speechSynthesis" in window) speechSynthesis.cancel(); }
let kitchenRecognition=null,kitchenListening=false,kitchenPauseTimer=null;
function voiceStatus(msg){const el=document.querySelector("#voiceAssistantStatus");if(el)el.textContent=msg;}
function startKitchenListening(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){alert("Voice commands are not supported by this browser. The Read Order buttons still work.");return;}
 clearTimeout(kitchenPauseTimer);
 if(!kitchenRecognition){
  kitchenRecognition=new SR(); kitchenRecognition.lang="en-US"; kitchenRecognition.continuous=true; kitchenRecognition.interimResults=false;
  kitchenRecognition.onresult=e=>{
   const said=Array.from(e.results).slice(e.resultIndex).map(r=>r[0].transcript).join(" ").toLowerCase().trim();
   if(/stop listening|pause baker|baker pause|pause assistant/.test(said)){stopKitchenListening("Voice assistant paused.");return;}
   if(/repeat (that|last) order|repeat order/.test(said)){repeatLastOrder();return;}
   if(/read (the )?order|repeat everything/.test(said)){repeatLastOrder();return;}
   const m=said.match(/(?:read|repeat) (?:item|hot dog|hot dawg) (one|two|three|four|five|\d+)/);
   if(m&&lastSpokenOrderId){const words={one:1,two:2,three:3,four:4,five:5};const n=words[m[1]]||Number(m[1]);speakKitchenOrder(lastSpokenOrderId,n-1);}
  };
  kitchenRecognition.onend=()=>{if(kitchenListening){try{kitchenRecognition.start();}catch(e){}}};
  kitchenRecognition.onerror=e=>{if(e.error==="not-allowed"){kitchenListening=false;voiceStatus("Microphone permission is off.");}};
 }
 kitchenListening=true; try{kitchenRecognition.start();}catch(e){}
 voiceStatus("Listening for kitchen commands");
}
function stopKitchenListening(message="Voice assistant paused."){
 kitchenListening=false; clearTimeout(kitchenPauseTimer);
 if(kitchenRecognition){try{kitchenRecognition.stop();}catch(e){}}
 voiceStatus(message);
}
function pauseKitchenListening(minutes){
 stopKitchenListening(`Paused for ${minutes} minutes`);
 kitchenPauseTimer=setTimeout(()=>startKitchenListening(),minutes*60000);
}


async function changeStatus(id,status){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));
 if(status==="Completed" && order && !order.payment_method){
  alert("Select how the customer paid before completing this order.");
  return;
 }
 try{
  await bdUpdateOrder(id,{status});
  await loadOrders();
 }catch(e){
  alert("Could not update order.");
 }
}

async function deleteOrder(id){
 if(!confirm("Delete this order?")) return;

 try{
  await bdDeleteOrder(id);
  await loadOrders();
 }catch(e){
  alert("Could not delete order.");
 }
}

function toggleCompleted(){
 hideCompleted=!hideCompleted;
 const btn=document.querySelector("#completedToggle");
 if(btn) btn.textContent=hideCompleted?"Show Completed":"Hide Completed";
 loadOrders();
}

function filterOrders(status){
 currentFilter=status;
 if(status==="Completed"&&hideCompleted){
  hideCompleted=false;
  const btn=document.querySelector("#completedToggle");
  if(btn) btn.textContent="Hide Completed";
 }
 loadOrders();
}

const recoveryToken=bdRecoveryToken();
if(recoveryToken){
 const loginBox=document.querySelector("#login");
 const recoveryBox=document.querySelector("#recovery");
 if(loginBox) loginBox.style.display="none";
 if(recoveryBox){ recoveryBox.classList.remove("hidden"); recoveryBox.style.display="grid"; }
 const save=document.querySelector("#savePasswordBtn");
 if(save) save.onclick=async function(){
  const p=document.querySelector("#newPassword").value;
  const c=document.querySelector("#confirmPassword").value;
  if(p.length<8){ alert("Use at least 8 characters."); return; }
  if(p!==c){ alert("Passwords do not match."); return; }
  save.disabled=true;
  try{
   await bdUpdatePassword(recoveryToken,p);
   history.replaceState(null,"",location.pathname);
   alert("Password updated. Sign in with your new password.");
   location.reload();
  }catch(e){
   save.disabled=false;
   alert("Could not update password. Request a new reset link and try again.");
  }
 };
}else if(bdHasSavedSession()){
 // On devices without a usable passkey, keep the trusted Supabase session signed in
 // so staff do not have to re-enter the password every time the app opens.
 (async()=>{
  if(await bdRefreshSession()){
   sessionStorage.removeItem("bdReturnToAdmin");
   showPinGate();
  }
 })();
}

setInterval(()=>{
 if(bdHasSavedSession()){
  loadOrders();
 }
},5000);

const loginBtn=document.querySelector("#loginBtn");
if(loginBtn){ loginBtn.onclick=async function(e){ e.preventDefault(); await login(); }; }
const forgotBtn=document.querySelector("#forgotBtn");
if(forgotBtn){ forgotBtn.onclick=async function(e){ e.preventDefault(); await forgotPassword(); }; }
const passwordInput=document.querySelector("#password");
if(passwordInput) passwordInput.addEventListener("keydown",e=>{if(e.key==="Enter") login();});

const pinUnlockBtn=document.querySelector("#pinUnlockBtn");
if(pinUnlockBtn)pinUnlockBtn.onclick=unlockWithPin;
const staffPinInput=document.querySelector("#staffPin");
if(staffPinInput)staffPinInput.addEventListener("keydown",e=>{if(e.key==="Enter")unlockWithPin();});
