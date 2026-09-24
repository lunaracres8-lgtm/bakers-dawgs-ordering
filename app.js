const menu=[
["Hot Dawgs","Carolina Classic Hot Dawg","Mustard, homemade homestyle slaw, chili and onions",3.28],
["Hot Dawgs","Sauerkraut & Mustard Dawg","Sauerkraut and mustard",3.28],
["Hot Dawgs","Chili & Cheez Dawg","Chili and cheese",3.28],
["Hot Dawgs","Chili, Onion & Mustard Dawg","Chili, onions and mustard",3.28],
["Hot Dawgs","Sweet Relish & Mustard Dawg","Sweet relish and mustard",3.28],
["Hot Dawgs","Loaded Hot Dawg","Choose 6–8 toppings",4.25],
["Smoked Sausages","Brat / Bratwurst","German smoked sausage",6.00],
["Smoked Sausages","Classic Plain Smoked Sausage","Johnsonville smoked sausage",6.00],
["Smoked Sausages","Cheddar Cheez Smoked Sausage","Cheddar cheese smoked sausage",6.00],
["Smoked Sausages","Jalapeño Smoked Sausage","Jalapeño smoked sausage",6.00],
["Smoked Sausages","The Perfect Brat","BBQ sauce, sauerkraut and fresh chopped onions",6.00],
["Sandwiches","Grilled Bologna on Toast (cut #5)","Choice of mustard, mayo and slaw",4.50],
["Sandwiches","Grilled Cheez Quesadilla","Optional chili add-on",4.00],
["Drinks & Sides","Bottled Drink / Soda","",2.00],
["Drinks & Sides","Bottled Water","",1.50],
["Drinks & Sides","Sweet Tea with Ice","Homemade sweet tea • No refills",1.75],
["Drinks & Sides","Lemonade Sweet Tea with Ice","Made with our homemade sweet tea • No refills",2.75],
["Drinks & Sides","Chips","",1.80]
];

const toppings=[
"Yellow Mustard","Spicy Mustard","Chili","Cheese",
"Fresh Onions","Homestyle Slaw","Sauerkraut","Sweet Relish",
"Grilled Onions","Grilled Green Peppers","BBQ Sauce"
];

let cart=JSON.parse(localStorage.getItem("bdCart")||"[]");
let active=null;
let orderingOpen=true;
let orderingStatusKnown=false;
let menuAvailability={};
const money=n=>"$"+n.toFixed(2);
const cats=[...new Set(menu.map(x=>x[0]))];

const menuEl=document.querySelector("#menu");

function render(cat){
 menuEl.innerHTML=cats.filter(c=>!cat||c===cat).map(c=>
 `<section class="category">
 <h2>${c}</h2>
 <div class="grid">${
 menu.map((x,i)=>x[0]===c?
 `<article class="item ${menuAvailability[x[1]]===false?"soldout":""}">
 <div class="foodIcon">${c==="Hot Dawgs"?"🌭":c==="Smoked Sausages"?"🔥":c==="Sandwiches"?"🥪":"🥤"}</div>
 <h3>${x[1]}</h3>
 <p class="desc">${x[2]}</p>
 <div class="price">${money(x[3])}</div>
 ${menuAvailability[x[1]]===false?`<div class="soldoutLabel">SOLD OUT</div><button class="add" disabled>Sold Out</button>`:`<button class="add" onclick="customize(${i})">Customize & Add</button>`}
 </article>`:"").join("")
 }</div></section>`).join("");
}

function goMenu(){
 if(orderingStatusKnown&&!orderingOpen) return showOrderingPaused();
 render();
 menuEl.scrollIntoView({behavior:"smooth"});
}

function showCat(c){
 render(c);
 menuEl.scrollIntoView();
}

function customize(i){
 if(menuAvailability[menu[i][1]]===false) return alert("Sorry, that item is sold out right now.");
 if(orderingStatusKnown&&!orderingOpen) return showOrderingPaused();
 active=i;
 let x=menu[i];
 let food=x[0]==="Hot Dawgs"||x[0]==="Smoked Sausages";
 let ques=x[1].includes("Quesadilla");

 modalBody.innerHTML=
 `<h2>${x[1]}</h2>
 <div class="bigprice">${money(x[3])}</div>
 <p>${x[2]}</p>
 ${food?`<h3>Toppings</h3>
 <div class="checks">${
 toppings.map(t=>`<label><input type="checkbox" value="${t}"> ${t}</label>`).join("")
 }</div>`:""}
 ${ques?'<label><input id="chiliAdd" type="checkbox"> Add chili +$0.50</label>':""}
 <label class="label">Special instructions</label>
 <textarea id="itemNotes" class="field" placeholder="Example: no onions, extra mustard"></textarea>
 <label class="label">Quantity</label>
 <input id="qty" class="field" type="number" min="1" max="20" value="1">
 <button class="checkout" onclick="addCustomized()">Add to Order</button>`;

 openModal();
}

function addCustomized(){
 let q=Math.max(1,+qty.value||1);
 let tops=[...document.querySelectorAll(".checks input:checked")].map(x=>x.value);
 let notes=itemNotes.value;
 let extra=document.querySelector("#chiliAdd")?.checked?.5:0;

 for(let n=0;n<q;n++){
  cart.push({i:active,tops,notes,extra});
 }

 save();
 closeModal();
}

function save(){
 localStorage.setItem("bdCart",JSON.stringify(cart));
 update();
}

function update(){
 cartCount.textContent=cart.length;
 cartTotal.textContent=cart.reduce(
  (s,x)=>s+menu[x.i][3]+(x.extra||0),0
 ).toFixed(2);
}

function pickupOptions(){
 const now=new Date();
 now.setMinutes(now.getMinutes()+20);
 const rounded=Math.ceil(now.getMinutes()/15)*15; now.setMinutes(rounded,0,0);
 let out=`<option value="">Choose a pickup time</option>`;
 for(let i=0;i<16;i++){
  const d=new Date(now.getTime()+i*15*60000);
  const value=d.toTimeString().slice(0,5);
  const label=d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
  out+=`<option value="${value}">${label}</option>`;
 }
 return out;
}

function showOrderingPaused(){
 modalBody.innerHTML=`<h2>Online Ordering Is Paused</h2><p>Baker’s Dawgs is not accepting online pickup orders right now. Please check back soon.</p><button class="checkout" onclick="closeModal()">OK</button>`;
 openModal();
}

async function refreshMenuAvailability(){
 try{
  const rows=await bdGetMenuAvailability();
  menuAvailability=Object.fromEntries((rows||[]).map(r=>[r.item_name,r.available!==false]));
  render();
 }catch(e){}
}

async function refreshOrderingStatus(){
 try{
  const settings=await bdGetRestaurantSettings();
  orderingOpen=settings?.ordering_open!==false;
  orderingStatusKnown=true;
  document.body.classList.toggle("ordering-paused",!orderingOpen);
  const hero=document.querySelector(".hero");
  if(hero){ hero.textContent=orderingOpen?"ORDER FOR PICKUP":"ONLINE ORDERING PAUSED"; hero.disabled=!orderingOpen; }
  const banner=document.querySelector("#orderingBanner");
  if(banner){ banner.classList.toggle("hidden",orderingOpen); }
 }catch(e){
  orderingStatusKnown=false;
 }
}

function openCart(){
 if(orderingStatusKnown&&!orderingOpen) return showOrderingPaused();
 let total=cart.reduce((s,x)=>s+menu[x.i][3]+(x.extra||0),0);

 modalBody.innerHTML=
 `<h2>Your Pickup Order</h2>
 ${cart.length?
 cart.map((x,n)=>
 `<div class="cartrow">
 <div>
 <b>${menu[x.i][1]}</b>
 <small>${
 [x.tops?.join(", "),x.extra?"Add chili":null,x.notes]
 .filter(Boolean).join(" • ")
 }</small>
 </div>
 <span>${money(menu[x.i][3]+(x.extra||0))}
 <button class="remove" onclick="removeItem(${n})">×</button>
 </span>
 </div>`).join("")
 :"<p>Your order is empty.</p>"}

 <div class="total">Total <b>${money(total)}</b></div>

 <label class="label">Your name</label>
 <input id="name" class="field">

 <label class="label">Phone number</label>
 <input id="phone" class="field" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="828-555-1234">

 <label class="label">Pickup time</label>
 <select id="time" class="field">${pickupOptions()}</select>

 <label class="label">Order notes</label>
 <textarea id="notes" class="field"></textarea>

 <button id="placeOrderBtn" class="checkout" onclick="placeOrder()">PLACE PICKUP ORDER</button>
 <p class="notice">Payment at pickup.</p>`;

 openModal();
}

function removeItem(n){
 cart.splice(n,1);
 save();
 openCart();
}

function openModal(){
 modal.classList.remove("hidden");
}

function closeModal(){
 modal.classList.add("hidden");
}

function backdrop(e){
 if(e.target.id==="modal")closeModal();
}

async function placeOrder(){
 try{
  const settings=await bdGetRestaurantSettings();
  orderingOpen=settings?.ordering_open!==false;
  orderingStatusKnown=true;
  if(!orderingOpen) return showOrderingPaused();
 }catch(e){
  return alert("We could not confirm that online ordering is open. Please try again.");
 }
 if(!cart.length)return alert("Add something first.");
 try{
  const rows=await bdGetMenuAvailability();
  const liveAvailability=Object.fromEntries((rows||[]).map(r=>[r.item_name,r.available!==false]));
  const soldOutInCart=cart.find(x=>liveAvailability[menu[x.i][1]]===false);
  if(soldOutInCart) return alert(`${menu[soldOutInCart.i][1]} is now sold out. Please remove it from your order.`);
 }catch(e){
  return alert("We could not confirm menu availability. Please try again.");
 }

 if(!name.value.trim()||!phone.value.trim()||!time.value)
  return alert("Enter your name, phone number and pickup time.");
 const digits=phone.value.replace(/\D/g,"");
 if(digits.length<10) return alert("Enter a valid phone number with area code.");

 let total=cart.reduce((s,x)=>s+menu[x.i][3]+(x.extra||0),0);
 const submitBtn=document.querySelector("#placeOrderBtn");
 if(submitBtn?.disabled) return;
 if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent="SENDING ORDER…"; }

 let order={
  customer_name:name.value.trim(),
  phone:phone.value.trim(),
  pickup_time:time.value,
  notes:notes.value.trim(),
  items:cart.map(x=>({
   name:menu[x.i][1],
   options:[
    x.tops?.join(", "),
    x.extra?"Add chili":null
   ].filter(Boolean).join(" • "),
   notes:x.notes||"",
   price:menu[x.i][3]+(x.extra||0)
  })),
  total,
  status:"New"
 };

 try{
  let saved=await bdCreateOrder(order);
  cart=[];
  save();

  modalBody.innerHTML=
  `<h2>Order Received!</h2>
  <p>Your Baker’s Dawgs pickup order <b>#${String(saved.id).slice(0,8)}</b> was sent to the restaurant.</p>
  <p><b>Pickup:</b> ${time.value}<br><b>Total:</b> ${money(total)}</p>
  <button class="checkout" onclick="closeModal()">DONE</button>`;
 }catch(e){
  if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent="PLACE PICKUP ORDER"; }
  alert("Order could not be sent. Please try again.");
 }
}

render();
update();
refreshOrderingStatus();
refreshMenuAvailability();
setInterval(refreshOrderingStatus,30000);
setInterval(refreshMenuAvailability,30000);
