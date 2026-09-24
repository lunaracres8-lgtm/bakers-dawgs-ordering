const ADMIN_PIN="2468";
const statuses=["New","Accepted","Cooking","Ready","Completed"];
let currentFilter="all";

function esc(v=""){
 return String(v).replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",
  '"':"&quot;","'":"&#39;"
 }[c]));
}

function login(){
 const pin=document.querySelector("#pin");
 if(pin.value===ADMIN_PIN){
  sessionStorage.setItem("bdAdmin","1");
  showBoard();
 }else{
  alert("Incorrect PIN");
 }
}

function logout(){
 sessionStorage.removeItem("bdAdmin");
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

  list.innerHTML=orders.map(o=>`
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

function seedDemo(){
 alert("Use the customer ordering page to submit a test order.");
}

function filterOrders(status){
 document.querySelectorAll(".order").forEach(card=>{
  const badge=card.querySelector(".status");
  card.style.display=(status==="all"||badge?.textContent.trim()===status)?"":"none";
 });
}

if(sessionStorage.getItem("bdAdmin")==="1"){
 showBoard();
}

setInterval(()=>{
 if(sessionStorage.getItem("bdAdmin")==="1"){
  loadOrders();
 }
},5000);
