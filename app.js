const menu=[
["Hot Dawgs","Carolina Classic Hot Dawg","Mustard, homestyle slaw, chili and onions",3.28],
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
["Drinks & Sides","Sweet Tea with Ice","No refills",1.75],
["Drinks & Sides","Lemonade Sweet Tea with Ice","No refills",2.75],
["Drinks & Sides","Chips","",1.80]
];

const toppings=[
"Yellow Mustard","Spicy Mustard","Chili","Cheese",
"Fresh Onions","Homestyle Slaw","Sauerkraut","Sweet Relish",
"Grilled Onions","Grilled Green Peppers","BBQ Sauce"
];

let cart=JSON.parse(localStorage.getItem("bdCart")||"[]");
let active=null;
const money=n=>"$"+n.toFixed(2);
const cats=[...new Set(menu.map(x=>x[0]))];

const menuEl=document.querySelector("#menu");

function render(cat){
 menuEl.innerHTML=cats.filter(c=>!cat||c===cat).map(c=>
 `<section class="category">
 <h2>${c}</h2>
 <div class="grid">${
 menu.map((x,i)=>x[0]===c?
 `<article class="item">
 <div class="foodIcon">${c==="Hot Dawgs"?"🌭":c==="Smoked Sausages"?"🔥":c==="Sandwiches"?"🥪":"🥤"}</div>
 <h3>${x[1]}</h3>
 <p class="desc">${x[2]}</p>
 <div class="price">${money(x[3])}</div>
 <button class="add" onclick="customize(${i})">Customize & Add</button>
 </article>`:"").join("")
 }</div></section>`).join("");
}

function goMenu(){
 render();
 menuEl.scrollIntoView({behavior:"smooth"});
}

function showCat(c){
 render(c);
 menuEl.scrollIntoView();
}

function customize(i){
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

function openCart(){
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
 <input id="phone" class="field" type="tel">

 <label class="label">Pickup time</label>
 <input id="time" class="field" type="time">

 <label class="label">Order notes</label>
 <textarea id="notes" class="field"></textarea>

 <button class="checkout" onclick="placeOrder()">PLACE PICKUP ORDER</button>
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
 if(!cart.length)return alert("Add something first.");

 if(!name.value.trim()||!phone.value.trim()||!time.value)
  return alert("Enter your name, phone number and pickup time.");

 let total=cart.reduce((s,x)=>s+menu[x.i][3]+(x.extra||0),0);

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
  <p>Your Baker’s Dawgs pickup order <b>#${String(saved.id).slice(0,8)}</b>
  was sent to the restaurant.</p>
  <button class="checkout" onclick="closeModal()">DONE</button>`;
 }catch(e){
  alert("Order could not be sent. Please try again.");
 }
}

render();
update();
