const statuses=["New","Accepted","Cooking","Ready","Completed"];
let currentFilter="all";
let hideCompleted=false;
let knownOrderIds=new Set();
let firstOrderLoad=true;
let orderingOpen=null;
let prepMinutes=20;
let menuAvailability={};
let soundEnabled=localStorage.getItem("bdSoundEnabled")!=="false";
const adminMenuItems=["Carolina Classic Hot Dawg","Sauerkraut & Mustard Dawg","Chili & Cheez Dawg","Chili, Onion & Mustard Dawg","Sweet Relish & Mustard Dawg","Loaded Hot Dawg","Brat / Bratwurst","Classic Plain Smoked Sausage","Cheddar Cheez Smoked Sausage","Jalapeño Smoked Sausage","The Perfect Brat","Grilled Bologna on Toast (cut #5)","Grilled Cheez Quesadilla","Bottled Drink / Soda","Bottled Water","Sweet Tea with Ice","Lemonade Sweet Tea with Ice","Chips"];

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
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=880; gain.gain.value=.12;
  osc.start(); setTimeout(()=>{osc.stop();ctx.close();},350);
 }catch(e){}
 if(navigator.vibrate) navigator.vibrate([250,100,250]);
}

async function login(){
 const email=document.querySelector("#email").value.trim();
 const password=document.querySelector("#password").value;
 if(!email||!password){ alert("Enter staff email and password."); return; }
 console.log("Admin sign-in tapped", email);
 try{
  await bdSignIn(email,password);
  showBoard();
 }catch(e){ alert("Sign-in failed. Check the staff email and password."); }
}

async function forgotPassword(){
 const email=document.querySelector("#email").value.trim();
 if(!email){ alert("Enter the staff email address first."); return; }
 console.log("Password reset tapped", email);
 try{ await bdResetPassword(email); alert("Password reset email sent. Check the staff email inbox and follow the reset link."); }
 catch(e){ alert("Could not send the reset email. Please try again."); }
}

function logout(){
 bdSignOut();
 location.reload();
}

function showBoard(){
 const loginBox=document.querySelector("#login");
 const board=document.querySelector("#app");

 if(loginBox) loginBox.style.display="none";
 if(board) board.style.display="block";
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
   return `<button class="${available?"available":"soldout"}" onclick="toggleMenuItem(${JSON.stringify(name)})"><span>${esc(name)}</span><b>${available?"AVAILABLE":"SOLD OUT"}</b></button>`;
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
      <div><a class="phoneLink" href="tel:${esc(String(o.phone||\"\").replace(/[^+\\d]/g,\"\"))}">${esc(o.phone)}</a> • Pickup: ${esc(o.pickup_time)} • ${waitTime(o.created_at)}</div>
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

async function changeStatus(id,status){
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

if(sessionStorage.getItem("bdAccessToken")){
 showBoard();
}

setInterval(()=>{
 if(sessionStorage.getItem("bdAccessToken")){
  loadOrders();
 }
},5000);

const loginBtn=document.querySelector("#loginBtn");
if(loginBtn){ loginBtn.onclick=async function(e){ e.preventDefault(); await login(); }; }
const forgotBtn=document.querySelector("#forgotBtn");
if(forgotBtn){ forgotBtn.onclick=async function(e){ e.preventDefault(); await forgotPassword(); }; }
const passwordInput=document.querySelector("#password");
if(passwordInput) passwordInput.addEventListener("keydown",e=>{if(e.key==="Enter") login();});
