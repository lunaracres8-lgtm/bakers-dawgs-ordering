const statuses=["New","Accepted","Cooking","Ready","Completed"];
let currentFilter="all";

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

async function login(){
 const email=document.querySelector("#email").value.trim();
 const password=document.querySelector("#password").value;
 if(!email||!password){ alert("Enter staff email and password."); return; }
 try{
  await bdSignIn(email,password);
  showBoard();
 }catch(e){ alert("Sign-in failed. Check the staff email and password."); }
}

async function forgotPassword(){
 const email=document.querySelector("#email").value.trim();
 if(!email){ alert("Enter the staff email address first."); return; }
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

 loadOrders();
}

async function loadOrders(){
 const list=document.querySelector("#orders");

 try{
  const orders=await bdGetOrders();

  const count=document.querySelector("#openCount");
  if(count){
   count.textContent=orders.filter(o=>o.status!=="Completed").length;
  }

  if(!orders.length){
   list.innerHTML="<p>No orders yet.</p>";
   return;
  }

  const visibleOrders=currentFilter==="all"?orders:orders.filter(o=>o.status===currentFilter);

  list.innerHTML=visibleOrders.map(o=>`
   <article class="order">
    <div class="orderTop">
     <div>
      <h2>${esc(o.customer_name)}</h2>
      <div>${esc(o.phone)} • Pickup: ${esc(o.pickup_time)}</div>
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

async function clearCompleted(){
 if(!confirm("Delete all completed orders?")) return;

 try{
  const orders=await bdGetOrders();
  const completed=orders.filter(o=>o.status==="Completed");

  for(const order of completed){
   await bdDeleteOrder(order.id);
  }

  await loadOrders();
 }catch(e){
  alert("Could not clear completed orders.");
 }
}

function filterOrders(status){
 currentFilter=status;
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

const forgotBtn=document.querySelector("#forgotBtn");
if(forgotBtn) forgotBtn.addEventListener("click",forgotPassword);
const passwordInput=document.querySelector("#password");
if(passwordInput) passwordInput.addEventListener("keydown",e=>{if(e.key==="Enter") login();});
