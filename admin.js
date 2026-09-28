
const BD_BRAND_DEFAULTS={businessName:"Baker's Dawgs",tagline:"Made fresh. Order ahead. Pick it up hot.",phone:"8282051139",email:"dawgsbaker@gmail.com",logo:"",background:"",primary:"#15100b",accent:"#ffc21a",specialEnabled:false,specialTitle:"",specialMessage:""};
function getBusinessBranding(){try{return {...BD_BRAND_DEFAULTS,...JSON.parse(localStorage.getItem("bdBusinessBranding")||"{}")};}catch(e){return {...BD_BRAND_DEFAULTS};}}
async function loadBusinessBrandingForm(){
 let b={...BD_BRAND_DEFAULTS};
 try{const cloud=await bdGetBusinessBranding();if(cloud)b={...b,businessName:cloud.business_name,tagline:cloud.tagline,phone:cloud.phone,email:cloud.email,logo:cloud.logo_url,background:cloud.background_url,primary:cloud.primary_color,accent:cloud.accent_color,specialEnabled:cloud.special_enabled,specialTitle:cloud.special_title,specialMessage:cloud.special_message};}catch(e){try{b={...b,...JSON.parse(localStorage.getItem("bdBusinessBranding")||"{}")};}catch(_){}}
 localStorage.setItem("bdBusinessBranding",JSON.stringify(b));
 const rawSpecial=String(b.specialMessage||"");const scheduleMatch=rawSpecial.match(/\[\[BD_DAY:(every|[0-6])\]\]/),hoursMatch=rawSpecial.match(/\[\[BD_HOURS:(manual|standard|daily)\]\]/);b.specialDay=scheduleMatch?scheduleMatch[1]:"every";b.autoHours=hoursMatch?hoursMatch[1]:"manual";b.specialMessage=rawSpecial.replace(/\n?\[\[BD_DAY:(every|[0-6])\]\]/,"").replace(/\n?\[\[BD_HOURS:(manual|standard|daily)\]\]/,"").trim();
 const map={brandBusinessName:"businessName",brandTagline:"tagline",brandPhone:"phone",brandEmail:"email",brandLogo:"logo",brandBackground:"background",brandPrimary:"primary",brandAccent:"accent",brandSpecialTitle:"specialTitle",brandSpecialMessage:"specialMessage",brandSpecialDay:"specialDay",brandAutoHours:"autoHours"};
 Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=b[key]||"";});
 const special=document.getElementById("brandSpecialEnabled");if(special)special.checked=b.specialEnabled===true;
 updateBrandPreview();updateSetupChecklist();
}
async function saveBusinessBranding(){
 const val=id=>(document.getElementById(id)?.value||"").trim();
 const specialDay=document.getElementById("brandSpecialDay")?.value||"every";
 const autoHours=document.getElementById("brandAutoHours")?.value||"manual";
 const b={businessName:val("brandBusinessName")||BD_BRAND_DEFAULTS.businessName,tagline:val("brandTagline")||BD_BRAND_DEFAULTS.tagline,phone:val("brandPhone"),email:val("brandEmail"),logo:val("brandLogo"),background:val("brandBackground"),primary:document.getElementById("brandPrimary")?.value||BD_BRAND_DEFAULTS.primary,accent:document.getElementById("brandAccent")?.value||BD_BRAND_DEFAULTS.accent,specialEnabled:!!document.getElementById("brandSpecialEnabled")?.checked,specialTitle:val("brandSpecialTitle"),specialMessage:val("brandSpecialMessage")+(specialDay!=="every"?`\n[[BD_DAY:${specialDay}]]`:"")+(autoHours!=="manual"?`\n[[BD_HOURS:${autoHours}]]`:"")};
 const s=document.getElementById("brandingStatus");if(s)s.textContent="Saving branding to all devices…";
 try{await bdSaveBusinessBranding(b);localStorage.setItem("bdBusinessBranding",JSON.stringify(b));if(s)s.textContent="Saved — customer website/app will use these settings.";alert("Business branding saved for all devices.");return true;}catch(e){console.error(e);if(s)s.textContent="Could not save branding to the cloud.";alert("Could not save branding. Make sure you are signed in as staff.");return false;}
}
async function previewBusinessBranding(){if(await saveBusinessBranding())window.open("index.html?brand_preview=1","_blank");}
async function resetBusinessBranding(){if(!confirm("Reset business branding to the installed defaults?"))return;const map={brandBusinessName:"businessName",brandTagline:"tagline",brandPhone:"phone",brandEmail:"email",brandLogo:"logo",brandBackground:"background",brandPrimary:"primary",brandAccent:"accent",brandSpecialTitle:"specialTitle",brandSpecialMessage:"specialMessage"};Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=BD_BRAND_DEFAULTS[key]||"";});const special=document.getElementById("brandSpecialEnabled");if(special)special.checked=false;updateBrandPreview();await saveBusinessBranding();}

function upgradeCustomizationUI(){
 const branding=document.querySelector(".ownerBranding");
 if(branding&&!branding.dataset.upgraded){
  branding.dataset.upgraded="1";
  branding.classList.add("ownerToolsPanel");
  branding.innerHTML=`<details class="ownerTools"><summary><span><b>Owner Settings</b><small>Business name, artwork, colors, and special offers</small></span><em>OPEN</em></summary><div class="ownerToolsBody"><div class="sectionTitle"><div><span class="eyebrow">PRIVATE OWNER CONTROLS</span><b>Business setup</b><small>These settings are hidden during daily order work.</small></div><div class="brandPreview" id="brandPreview"><span>LIVE LOOK</span><strong id="brandPreviewName">Baker's Dawgs</strong></div></div><div class="brandingFields"><label>Business name<input id="brandBusinessName" type="text" placeholder="Your Restaurant" oninput="updateBrandPreview()"></label><label>Tagline<input id="brandTagline" type="text" placeholder="Order ahead. Pick it up hot."></label><label>Phone<input id="brandPhone" type="tel" placeholder="555-555-5555"></label><label>Email<input id="brandEmail" type="email" placeholder="orders@example.com"></label><label>Primary color<input id="brandPrimary" type="color" value="#15100b" oninput="updateBrandPreview()"></label><label>Accent color<input id="brandAccent" type="color" value="#ffc21a" oninput="updateBrandPreview()"></label></div><div class="artworkUpload"><div><b>Logo artwork</b><small>Upload a logo from this phone or tablet, or paste an image link.</small><input id="brandLogo" type="url" placeholder="Paste logo image link"><input id="brandLogoUpload" type="file" accept="image/*"></div><button type="button" class="secondaryButton" onclick="document.getElementById('brandLogoUpload').click()">UPLOAD LOGO</button></div><div class="artworkUpload"><div><b>Full background artwork</b><small>Use a food photo, texture, or your own branded background.</small><input id="brandBackground" type="url" placeholder="Paste background image link"><input id="brandBackgroundUpload" type="file" accept="image/*"></div><button type="button" class="secondaryButton" onclick="document.getElementById('brandBackgroundUpload').click()">UPLOAD BACKGROUND</button></div><div class="buttonRow"><button type="button" onclick="saveBusinessBranding()">SAVE BRAND LOOK</button><button type="button" class="secondaryButton" onclick="previewBusinessBranding()">PREVIEW CUSTOMER SCREEN</button><button type="button" class="textButton" onclick="resetBusinessBranding()">RESET</button></div><small id="brandingStatus">Changes save to the restaurant template.</small></div></details>`;
  branding.querySelector(".buttonRow")?.insertAdjacentHTML("beforebegin",`<div class="specialEditor"><span class="eyebrow">OPTIONAL DAILY SPECIAL</span><label class="specialToggle"><input id="brandSpecialEnabled" type="checkbox"> Show a special on the customer menu</label><label>Show it<select id="brandSpecialDay"><option value="every">Every day</option><option value="0">Sunday only</option><option value="1">Monday only</option><option value="2">Tuesday only</option><option value="3">Wednesday only</option><option value="4">Thursday only</option><option value="5">Friday only</option><option value="6">Saturday only</option></select></label><label>Special headline<input id="brandSpecialTitle" type="text" maxlength="45" placeholder="Today’s Special"></label><label>Special message<input id="brandSpecialMessage" type="text" maxlength="120" placeholder="Example: Free cake slice with a meal today."></label></div><details class="ownerTools operationalTools"><summary><span><b>Operations & backups</b><small>Inventory warnings, closeout protection, and a safe backup file.</small></span><em>OPEN</em></summary><div class="ownerToolsBody"><div id="inventoryManager"></div><div class="buttonRow"><button type="button" class="secondaryButton" onclick="downloadSystemBackup()">DOWNLOAD BACKUP</button><button type="button" class="secondaryButton" onclick="setAdminView('orders')">OPEN DAILY CLOSEOUT</button></div></div></details>`);
  branding.querySelector(".operationalTools")?.insertAdjacentHTML("beforebegin",`<div class="specialEditor"><span class="eyebrow">AUTOMATIC ONLINE ORDERING HOURS</span><label>Schedule<select id="brandAutoHours"><option value="manual">Manual only — use the Open / Pause button</option><option value="standard">Baker’s Dawgs regular hours: Mon–Wed 11–2; Thu–Fri 11–2 & 5–8</option><option value="daily">Every day, 11 AM–2 PM</option></select></label><small>The customer ordering page follows this schedule automatically. You can still pause orders anytime.</small></div>`);
  document.getElementById("brandLogoUpload")?.addEventListener("change",e=>uploadBrandImage(e.target,"brandLogo"));
 document.getElementById("brandBackgroundUpload")?.addEventListener("change",e=>uploadBrandImage(e.target,"brandBackground"));
  renderInventoryPanel();
 }
 const manager=document.querySelector("#menuAvailabilityControls")?.closest(".menuControls");
 if(manager&&!manager.dataset.upgraded){
  manager.dataset.upgraded="1";
  manager.classList.add("menuManager");
  manager.querySelector("div")?.replaceWith(Object.assign(document.createElement("div"),{className:"sectionTitle",innerHTML:`<div><span class="eyebrow">MENU BUILDER</span><b>Menu items</b><small>Edit prices and descriptions, add an item, or remove one before handing this template to the next owner.</small></div><button type="button" onclick="openMenuItemEditor()">＋ ADD MENU ITEM</button>`}));
  manager.insertAdjacentHTML("beforeend",`<div id="menuBuilderFooter" class="menuBuilderFooter"><button type="button" class="secondaryButton" onclick="restoreSampleMenu()">RESTORE SAMPLE MENU</button><small>Menu changes save immediately and update the customer screen.</small></div>`);
  manager.querySelector(".sectionTitle")?.insertAdjacentHTML("afterend",`<div id="menuFilterTabs" class="menuFilterTabs"></div>`);
 }
}
function updateBrandPreview(){const name=document.getElementById("brandBusinessName")?.value||"Your Restaurant";const primary=document.getElementById("brandPrimary")?.value||"#15100b";const accent=document.getElementById("brandAccent")?.value||"#ffc21a";const p=document.getElementById("brandPreview"),t=document.getElementById("brandPreviewName");if(p){p.style.background=primary;p.style.borderColor=accent;}if(t){t.textContent=name;t.style.color=accent;}}
function setPreviewMode(mode,button){previewMode=mode;document.querySelector(".brandPreview")?.classList.toggle("tabletPreview",mode==="tablet");document.querySelectorAll(".previewSwitch button").forEach(b=>b.classList.toggle("active",b===button));}
function updateSetupChecklist(){const box=document.getElementById("setupSteps");if(!box)return;const checks=[["Business details",!!document.getElementById("brandBusinessName")?.value&&!!document.getElementById("brandPhone")?.value],["Brand colors",!!document.getElementById("brandPrimary")?.value&&!!document.getElementById("brandAccent")?.value],["Artwork",!!document.getElementById("brandLogo")?.value||!!document.getElementById("brandBackground")?.value],["Menu",editableMenuItems.length>0]];box.innerHTML=checks.map(([label,done])=>`<span class="${done?"done":""}">${done?"✓":"○"} ${label}</span>`).join("");}
async function uploadBrandImage(input,targetId){
 const file=input?.files?.[0];if(!file)return;
 if(!file.type.startsWith("image/")){alert("Please choose an image file.");return;}
 const status=document.getElementById("brandingStatus");if(status)status.textContent="Preparing artwork…";
 const source=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=source;});
 const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL("image/jpeg",.88);if(data.length>1800000){alert("That image is still too large. Please choose a smaller photo.");return;}
 const field=document.getElementById(targetId);if(field)field.value=data;if(status)status.textContent="Artwork ready — press Save Brand Look to publish it.";
}

const statuses=["New","Accepted","Cooking","Ready","Completed","Voided"];
let currentFilter="all";
let hideCompleted=true;
let knownOrderIds=new Set();
let firstOrderLoad=true;
let orderingOpen=null;
let prepMinutes=20;
let menuAvailability={};
let soundEnabled=localStorage.getItem("bdSoundEnabled")!=="false";
const adminMenuItems=["Carolina Classic Hot Dawg","Sauerkraut & Mustard Dawg","Chili & Cheez Dawg","Chili, Onion & Mustard Dawg","Sweet Relish & Mustard Dawg","Loaded Hot Dawg","Brat / Bratwurst","Classic Plain Smoked Sausage","Cheddar Cheez Smoked Sausage","Jalapeño Smoked Sausage","The Perfect Brat","Grilled Bologna on Toast (cut #5)","Grilled Cheez Quesadilla","Bottled Drink / Soda","Bottled Water","Sweet Tea with Ice","Lemonade Sweet Tea with Ice","Chips","German Chocolate Cake","3 Milks Cake"];
let editableMenuItems=[];
let currentMenuCategory="All";
let previewMode="phone";
let windowSaleCart=[];
let windowSaleDraft={name:"",phone:"",payment:""};
let windowSaleDiscount={amount:0,reason:""};
let windowSaleLastAdded="";
let windowLoyaltyMessage="";
let windowSaleHoldTimer=null;
let windowSaleHoldHandled=false;
let recentOrderBannerTimer=null;
let managerApprovalUntil=0;

function ticketCode(order){return String(order?.id||"").replace(/[^a-z0-9]/gi,"").slice(-6).toUpperCase()||"PENDING";}
function inventorySettings(){try{return JSON.parse(localStorage.getItem("bdInventorySettings")||"{}");}catch(e){return {};}}
function saveInventorySettings(settings){localStorage.setItem("bdInventorySettings",JSON.stringify(settings));}
function inventoryUsage(){
 const used={};
 (typeof bdDailySummary==="function"?bdDailySummary().items:[]).forEach(line=>{used[line.name]=(used[line.name]||0)+Number(line.count||0);});
 return used;
}
function lowStockItems(){
 const settings=inventorySettings(),used=inventoryUsage();
 return Object.entries(settings).map(([name,config])=>({name,onHand:Number(config.onHand||0)-Number(used[name]||0),warning:Number(config.warning||0),sold:Number(used[name]||0)})).filter(item=>item.warning>0&&item.onHand<=item.warning);
}
function salesSnapshot(){
 const summary=typeof bdDailySummary==="function"?bdDailySummary():{items:[],payments:{},completedTotal:0,completedCount:0};
 const top=[...(summary.items||[])].sort((a,b)=>Number(b.count||0)-Number(a.count||0)).slice(0,3);
 const completed=(summary.completed||[]),byHour={};completed.forEach(order=>{const hour=new Date(order.created_at).getHours();byHour[hour]=(byHour[hour]||0)+1;});
 const busiest=Object.entries(byHour).sort((a,b)=>b[1]-a[1])[0];
 const hourLabel=busiest?new Date(2000,0,1,Number(busiest[0])).toLocaleTimeString([], {hour:"numeric"}):"—";
 const card=Object.entries(summary.payments||{}).filter(([,value])=>Number(value.total||0)>0).map(([name,value])=>`${name.replace(/^Square — /,"")}: $${Number(value.total).toFixed(2)}`).join(" • ")||"No payments completed yet";
 return {top,hour:hourLabel,hourCount:busiest?.[1]||0,paymentText:card,total:Number(summary.completedTotal||0),count:Number(summary.completedCount||0)};
}
function shiftKey(day=typeof bdLocalDayKey==="function"?bdLocalDayKey():new Date().toLocaleDateString("en-CA")){return "bdShifts:"+day;}
function shiftsToday(){try{return JSON.parse(localStorage.getItem(shiftKey())||"[]");}catch(e){return [];}}
function saveShifts(shifts){localStorage.setItem(shiftKey(),JSON.stringify(shifts));}
function shiftHours(shift){const end=shift.out?new Date(shift.out):new Date();return Math.max(0,(end-new Date(shift.in))/36e5);}
function renderTimeClock(){
 const box=document.getElementById("timeClock");if(!box)return;
 const shifts=shiftsToday(),open=shifts.filter(shift=>!shift.out),rows=shifts.map((shift,index)=>`<div class="shiftRow"><span><b>${esc(shift.name)}</b><small>${new Date(shift.in).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}${shift.out?` – ${new Date(shift.out).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:" • CLOCKED IN"}</small></span><strong>${shiftHours(shift).toFixed(2)}h</strong>${shift.out?"":`<button type="button" onclick="clockOut(${index})">CLOCK OUT</button>`}</div>`).join("");
 const hours=shifts.reduce((total,shift)=>total+shiftHours(shift),0);
 box.innerHTML=`<div class="sectionTitle"><div><span class="eyebrow">SHIFT CLOCK</span><b>Employee time</b><small>Simple shift tracking for today. The closeout file includes the hours.</small></div><div class="shiftTotal">${hours.toFixed(2)} total hrs</div></div><div class="clockInRow"><input id="clockEmployeeName" maxlength="50" placeholder="Employee name"><button type="button" onclick="clockInEmployee()">CLOCK IN</button></div>${open.length?`<div class="clockedIn">● ${open.length} employee${open.length===1?"":"s"} clocked in</div>`:""}<div class="shiftRows">${rows||"<p class='windowEmpty'>No shifts started today.</p>"}</div>`;
}
function clockInEmployee(){const input=document.getElementById("clockEmployeeName"),name=input?.value.trim();if(!name){alert("Enter the employee’s name first.");return;}const shifts=shiftsToday();if(shifts.some(shift=>!shift.out&&shift.name.toLowerCase()===name.toLowerCase())){alert(`${name} is already clocked in.`);return;}shifts.push({name,in:new Date().toISOString(),out:null});saveShifts(shifts);renderTimeClock();}
function clockOut(index){const shifts=shiftsToday();if(!shifts[index]||shifts[index].out)return;shifts[index].out=new Date().toISOString();saveShifts(shifts);renderTimeClock();}
function showNewOrderBanner(count){
 let banner=document.getElementById("newOrderBanner");
 if(!banner){banner=document.createElement("button");banner.id="newOrderBanner";banner.type="button";banner.onclick=()=>{setAdminView("orders");banner.classList.remove("show");};document.body.append(banner);}
 banner.textContent=`🔔 ${count===1?"NEW ORDER":"NEW ORDERS"} — TAP TO OPEN`;
 banner.classList.add("show");clearTimeout(recentOrderBannerTimer);recentOrderBannerTimer=setTimeout(()=>banner.classList.remove("show"),9000);
}
async function requireManagerApproval(action){
 if(Date.now()<managerApprovalUntil)return true;
 const pin=prompt(`Manager PIN required to ${action}.`);if(pin===null)return false;
 const expected=localStorage.getItem("bdManagerPinHash")||localStorage.getItem("bdStaffPinHash")||DEFAULT_STAFF_PIN_HASH;
 if(await hashPin(pin.trim())!==expected){alert("Manager PIN did not match.");return false;}
 managerApprovalUntil=Date.now()+5*60*1000;return true;
}
function renderInventoryPanel(){
 const box=document.getElementById("inventoryManager");if(!box)return;
 const settings=inventorySettings(),used=inventoryUsage(),items=editableMenuItems.filter(item=>item.available!==false);
 const rows=items.map(item=>{const config=settings[item.item_name]||{},onHand=config.onHand??"",warning=config.warning??"";const remaining=onHand===""?"—":Math.max(0,Number(onHand)-Number(used[item.item_name]||0));return `<label class="inventoryRow"><span><b>${esc(item.item_name)}</b><small>Sold today: ${used[item.item_name]||0} • remaining: ${remaining}</small></span><input data-inventory-name="${esc(item.item_name)}" data-inventory-field="onHand" inputmode="numeric" placeholder="On hand" value="${onHand}"><input data-inventory-name="${esc(item.item_name)}" data-inventory-field="warning" inputmode="numeric" placeholder="Warn at" value="${warning}"></label>`;}).join("");
 const low=lowStockItems();
 const snapshot=salesSnapshot();
 box.innerHTML=`<div class="salesSnapshot"><span><b>$${snapshot.total.toFixed(2)}</b><small>Completed today</small></span><span><b>${snapshot.hour}</b><small>${snapshot.hourCount?`${snapshot.hourCount} order${snapshot.hourCount===1?"":"s"}`:"No busy hour yet"}</small></span><span><b>${snapshot.top[0]?esc(snapshot.top[0].name):"—"}</b><small>${snapshot.top[0]?`${snapshot.top[0].count} sold`:"Top seller"}</small></span></div><div class="salesPaymentMix"><b>Payment mix</b><small>${esc(snapshot.paymentText)}</small></div>${snapshot.top.length?`<div class="topSellers"><b>Best sellers today</b>${snapshot.top.map((item,index)=>`<span>${index+1}. ${esc(item.name)} <strong>${item.count}</strong></span>`).join("")}</div>`:""}<div id="timeClock"></div><div class="sectionTitle"><div><span class="eyebrow">INVENTORY</span><b>Low-stock warnings</b><small>Set opening counts once each day. Completed sales reduce the remaining count automatically.</small></div><button type="button" class="secondaryButton" onclick="saveInventoryFromPanel()">SAVE COUNTS</button></div>${low.length?`<div class="lowStockAlert">⚠ ${low.map(item=>`${esc(item.name)}: ${item.onHand} left`).join(" • ")}</div>`:""}<div class="inventoryHeaders"><span>Item</span><span>On hand</span><span>Warn at</span></div><div class="inventoryRows">${rows||"<p>Open Menu once to load items.</p>"}</div>`;renderTimeClock();
}
async function saveInventoryFromPanel(){
 if(!await requireManagerApproval("change inventory counts"))return;
 const settings=inventorySettings();document.querySelectorAll("#inventoryManager input[data-inventory-name]").forEach(input=>{const name=input.dataset.inventoryName,field=input.dataset.inventoryField;settings[name]=settings[name]||{};settings[name][field]=Math.max(0,Number(input.value||0));});saveInventorySettings(settings);renderInventoryPanel();alert("Inventory counts saved on this tablet.");
}
function downloadSystemBackup(){
 const backup={saved_at:new Date().toISOString(),business:JSON.parse(localStorage.getItem("bdBusinessBranding")||"{}"),inventory:inventorySettings(),shifts:shiftsToday(),menu:editableMenuItems,orders:window.bdCurrentOrders||[]};
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));a.download=`Bakers_Dawgs_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function printOrderReceipt(id){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));if(!order)return;
 const rows=(order.items||[]).map(i=>`<tr><td>${esc(i.name)}${i.options?`<br><small>${esc(i.options)}</small>`:""}</td><td>${Number(i.quantity||1)} × $${Number(i.price||0).toFixed(2)}</td></tr>`).join("");
 const win=window.open("","_blank");if(!win){alert("Allow pop-ups to print the receipt.");return;}
 win.document.write(`<main style="font:16px Arial;max-width:360px;margin:20px auto"><h1>Baker's Dawgs</h1><h2>Receipt #${ticketCode(order)}</h2><p>${esc(order.customer_name||"Customer")}<br>${esc(order.phone||"")}<br>${esc(order.pickup_time||"")} • ${esc(order.status||"")}</p><table style="width:100%;border-collapse:collapse">${rows}</table><hr><h2>Total: $${Number(order.total||0).toFixed(2)}</h2><p>Payment: ${esc(order.payment_method||"Pay at pickup")}</p></main>`);win.document.close();win.focus();win.print();
}
function textCustomerReady(id){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));if(!order)return;
 const phone=String(order.phone||"").replace(/\D/g,"");if(phone.length<10){alert("This order does not have a valid phone number.");return;}
 const message=`Baker's Dawgs: Your order #${ticketCode(order)} is ready for pickup. Thank you!`;
 location.href=`sms:${phone}?body=${encodeURIComponent(message)}`;
}
function repeatOrderAtWindow(id){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));if(!order)return;
 windowSaleCart=(order.items||[]).map(item=>({id:"repeat-"+item.name,name:item.name,price:Number(item.price||0),quantity:Math.max(1,Number(item.quantity)||1)}));
 windowSaleDraft={name:order.customer_name||"",phone:order.phone||"",payment:""};windowSaleLastAdded=`Repeated ticket #${ticketCode(order)}`;setAdminView("window");
}
function checkWindowLoyalty(){
 saveWindowSaleDraft();
 const modal=document.createElement("div");
 modal.className="loyaltyModal";
 modal.innerHTML=`<section><button type="button" class="closeLoyalty" aria-label="Close loyalty">×</button><span class="eyebrow">BAKER'S DAWGS REWARDS</span><h2>Check customer loyalty</h2><p>Enter the customer’s phone number to see completed visits and available rewards.</p><label>Customer phone<input id="loyaltyPhone" inputmode="tel" maxlength="30" value="${esc(windowSaleDraft.phone||"")}" placeholder="(828) 555-1234"></label><button type="button" id="checkLoyaltyButton">CHECK LOYALTY</button><div id="loyaltyResultBox" aria-live="polite"></div></section>`;
 document.body.append(modal);
 const close=()=>modal.remove();
 modal.querySelector(".closeLoyalty").onclick=close;
 modal.addEventListener("click",event=>{if(event.target===modal)close();});
 const phoneInput=modal.querySelector("#loyaltyPhone"),result=modal.querySelector("#loyaltyResultBox");
 const check=()=>{
  const phone=String(phoneInput.value||"").replace(/\D/g,"");
  if(phone.length<10){result.textContent="Enter a full 10-digit phone number first.";return;}
  windowSaleDraft.phone=phoneInput.value;
  const visits=(window.bdCurrentOrders||[]).filter(order=>order.status==="Completed"&&String(order.phone||"").replace(/\D/g,"")===phone).length;
  const goal=8,rewards=Math.floor(visits/goal),progress=visits%goal;
  result.innerHTML=`<b>${visits} completed visit${visits===1?"":"s"}</b><span>${progress} of ${goal} toward the next reward${rewards?` • ${rewards} reward${rewards===1?"":"s"} available`:""}</span>`;
 };
 modal.querySelector("#checkLoyaltyButton").onclick=check;
 phoneInput.addEventListener("keydown",event=>{if(event.key==="Enter")check();});
 setTimeout(()=>phoneInput.focus(),40);
}
function showWindowLoyaltyMessage(){
 const data=windowLoyaltyMessage,customer=document.querySelector("#windowSale .windowCustomer");
 if(!data||!customer)return;
 const panel=document.createElement("section");
 panel.className="loyaltyResult";
 panel.innerHTML=data.message?`<b>LOYALTY</b><span>${esc(data.message)}</span><button type="button" class="textButton" onclick="windowLoyaltyMessage='';renderWindowOrder()">×</button>`:`<b>LOYALTY — ${esc(data.name)}</b><span>${data.visits} completed visit${data.visits===1?"":"s"} • ${data.progress} of ${data.goal} toward the next reward${data.rewards?` • ${data.rewards} reward${data.rewards===1?"":"s"} available`:""}</span><button type="button" class="textButton" onclick="windowLoyaltyMessage='';renderWindowOrder()">×</button>`;
 customer.insertAdjacentElement("afterend",panel);
}

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
 return i>=0&&i<3?statuses[i+1]:null;
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


// Fingerprint unlock opens a saved staff session; first sign-in still requires a password.
let nativeEnrollmentUserId="";
async function onNativeBiometricSuccess(purpose){
 if(purpose==="enroll"){
  try{
   const userId=nativeEnrollmentUserId||(await bdCurrentStaffUser()).id;
   localStorage.setItem("bdNativeBiometricUserId",userId);
   nativeEnrollmentUserId="";
   setBiometricButtonLabels();
   setBiometricStatus("Fingerprint unlock is ready for this staff account.");
  }catch(e){setBiometricStatus("Could not link fingerprint. Sign in again and retry.",true);}
  return;
 }
 if(!localStorage.getItem("bdNativeBiometricUserId")){alert("Sign in and enable fingerprint unlock for this staff account first.");return;}
 try{
  if(!await bdRefreshSession())throw new Error("Staff session expired. Sign in with your password again.");
  const user=await bdCurrentStaffUser();
  if(user.id!==localStorage.getItem("bdNativeBiometricUserId"))throw new Error("This fingerprint unlock belongs to a different staff account. Sign in with your own password.");
  document.querySelector("#pinGate")?.classList.add("hidden");
  showBoard();
 }catch(e){alert(e.message||"Please sign in with your staff password.");location.reload();}
}
function onNativeBiometricError(message){setBiometricStatus("Fingerprint unavailable: "+message,true);}
function setBiometricButtonLabels(){
 const native=!!window.BakersDawgsAndroid?.authenticateBiometric;
 const main=document.getElementById("biometricBtn"),pin=document.querySelector("#pinGate .biometric"),enroll=document.getElementById("enrollBiometricBtn"),board=document.getElementById("enrollBiometricBoardBtn"),shortcut=document.getElementById("biometricSetupShortcut");
 const enrolled=native?!!localStorage.getItem("bdNativeBiometricUserId"):!!localStorage.getItem("bdWebPasskeyEnrolled");
 if(main)main.textContent=native?"🔐 USE FINGERPRINT":"🔐 USE PASSKEY";
 if(pin)pin.textContent=native?"🔐 USE FINGERPRINT":"🔐 USE PASSKEY";
 if(enroll)enroll.textContent=native?"Enable fingerprint for this device":"Enable passkey for this browser";
 if(board)board.textContent=native?"🔐 SET UP FINGERPRINT":"🔐 SET UP PASSKEY";
 if(shortcut)shortcut.textContent=native?"🔐 SET UP FINGERPRINT":"🔐 SET UP PASSKEY";
 if(board)board.hidden=enrolled;
 if(shortcut)shortcut.hidden=enrolled;
}
function ensureBoardBiometricButton(){
 const toolbar=document.querySelector(".toolbar");
 if(toolbar&&!document.getElementById("enrollBiometricBoardBtn")){
  const button=document.createElement("button");
  button.id="enrollBiometricBoardBtn";
  button.type="button";
  button.className="biometric";
  button.onclick=enrollBiometric;
  toolbar.insertBefore(button,toolbar.querySelector("button[onclick='lockAdminScreen()']")||toolbar.lastElementChild);
 }
 if(!document.getElementById("biometricStatus")){
  const status=document.createElement("div");
  status.id="biometricStatus";
  status.setAttribute("role","status");
  document.body.append(status);
 }
 setBiometricButtonLabels();
}
function setBiometricStatus(message,error=false){
 const status=document.getElementById("biometricStatus");
 if(!status)return;
 status.textContent=message;
 status.classList.toggle("error",!!error);
 status.classList.add("show");
 clearTimeout(window.bdBiometricStatusTimer);
 window.bdBiometricStatusTimer=setTimeout(()=>status.classList.remove("show"),error?8000:3500);
}
function ensureMadeByCredit(){
 const app=document.getElementById("app");
 if(!app)return;
 let credit=document.getElementById("adminMadeByCredit");
 if(!credit){
  credit=document.createElement("footer");
  credit.id="adminMadeByCredit";
  credit.textContent="Made by Lunar Acres Restaurant Services";
 }
 app.append(credit);
}
async function enrollBiometric(){
 if(!bdHasSavedSession()){alert("Sign in with your own staff email and password first.");return;}
 if(window.BakersDawgsAndroid?.authenticateBiometric){
  try{if(!await bdRefreshSession())throw new Error("Session expired");nativeEnrollmentUserId=(await bdCurrentStaffUser()).id;}
  catch(e){setBiometricStatus("Staff sign-in expired. Sign in again, then set up fingerprint.",true);return;}
  setBiometricStatus("Opening Android fingerprint…");
  window.BakersDawgsAndroid.authenticateBiometric("enroll");return;
 }
 if(!window.PublicKeyCredential){alert("This browser does not support passkeys.");return;}
 try{
  if(!await bdRefreshSession())throw new Error("Staff session expired");
  await bdRegisterPasskey();
  localStorage.setItem("bdWebPasskeyEnrolled","1");
  alert("Passkey registered. You can use it to sign in from this browser.");
 }catch(e){
  const message=e?.message||"Please try again.";
  if(/passkey_disabled/i.test(message))alert("Passkeys have not been turned on for this website yet. Use the Baker's Dawgs Admin APK for fingerprint unlock, or enable passkeys in Supabase before using the browser button.");
  else alert("Could not register the passkey: "+message);
 }
}
async function biometricUnlock(){
 if(window.BakersDawgsAndroid?.authenticateBiometric){
  if(!bdHasSavedSession()){alert("Sign in with your staff email and password once on this phone, then add its fingerprint.");return;}
  if(!localStorage.getItem("bdNativeBiometricUserId")){alert("Sign in and tap 'Enable fingerprint for this account' first. You can use your staff PIN now.");return;}
  window.BakersDawgsAndroid.authenticateBiometric("unlock");return;
 }
 if(!window.PublicKeyCredential){alert("This browser does not support passkeys.");return;}
 try{
  const data=await bdSignInWithPasskey();
  if(!data?.session)throw new Error("No authenticated session was returned.");
  sessionStorage.removeItem("bdReturnToAdmin");showBoard();
 }catch(e){
  if(e?.name==="NotAllowedError")return;
  const message=e?.message||"Please try again.";
  if(/passkey_disabled/i.test(message))alert("Passkeys have not been turned on for this website yet. Open the Baker's Dawgs Admin APK and use its fingerprint button, or enable passkeys in Supabase first.");
  else alert("Passkey sign-in failed: "+message);
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
  const staffUser=await bdCurrentStaffUser();
  if((window.BakersDawgsAndroid?.authenticateBiometric && localStorage.getItem("bdNativeBiometricUserId")!==staffUser.id) || (!window.BakersDawgsAndroid && window.PublicKeyCredential && !localStorage.getItem("bdWebPasskeyEnrolled"))){
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
function switchEmployee(){
 if(!confirm("Sign out this staff account so another employee can sign in?"))return;
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
 ensureBoardBiometricButton();
 document.body.dataset.adminLocked="false";
 armAdminAutoLock();
 const soundBtn=document.querySelector("#soundToggle");
 if(soundBtn) soundBtn.textContent=soundEnabled?"🔔 Alerts On":"🔕 Alerts Off";

 loadOrders();
 loadRestaurantControls();
 setupAdminViews();
 ensureMadeByCredit();
 updateSpeechReadbackUI();
 upgradeCustomizationUI();
 loadMenuAvailability();
 loadBusinessBrandingForm();
}

let activeAdminView=localStorage.getItem("bdAdminView")||"orders";
function setupAdminViews(){
 const app=document.getElementById("app");if(!app||app.dataset.viewsReady)return;
 app.dataset.viewsReady="1";
 const owner=app.querySelector(".ownerBranding");
 const menu=[...app.querySelectorAll(".menuControls")].find(section=>section!==owner);
 const windowSale=document.createElement("section");
 windowSale.id="windowSale";
 windowSale.className="windowSale";
 windowSale.dataset.adminView="window";
 app.append(windowSale);
 const kitchen=document.createElement("section");
 kitchen.id="kitchenDisplay";
 kitchen.className="kitchenDisplay";
 kitchen.dataset.adminView="kitchen";
 app.append(kitchen);
 const orders=[app.querySelector(".restaurantControls"),app.querySelector(".toolbar"),app.querySelector(".voiceAssistant"),app.querySelector("#dailyCloseout"),app.querySelector(".metrics"),app.querySelector("nav"),app.querySelector("#orders")];
 orders.forEach(el=>{if(el)el.dataset.adminView="orders";});
 if(menu)menu.dataset.adminView="menu";
 if(owner)owner.dataset.adminView="owner";
 const tabs=document.createElement("nav");
 tabs.className="adminViewTabs";
 tabs.innerHTML=`<button type="button" data-view="orders" onclick="setAdminView('orders')">ORDERS</button><button type="button" data-view="kitchen" onclick="setAdminView('kitchen')">KITCHEN</button><button type="button" data-view="window" onclick="setAdminView('window')">WINDOW SALE</button><button type="button" data-view="menu" onclick="setAdminView('menu')">MENU</button><button type="button" data-view="owner" onclick="setAdminView('owner')">OWNER</button>`;
 app.prepend(tabs);
 setAdminView(activeAdminView);
}
function setAdminView(view){
 activeAdminView=["orders","kitchen","window","menu","owner"].includes(view)?view:"orders";
 document.body.dataset.adminView=activeAdminView;
 localStorage.setItem("bdAdminView",activeAdminView);
 document.querySelectorAll(".adminViewTabs button").forEach(button=>button.classList.toggle("active",button.dataset.view===activeAdminView));
 if(activeAdminView==="window")renderWindowOrder();
 if(activeAdminView==="kitchen")renderKitchenDisplay();
}

function renderKitchenDisplay(){
 const box=document.getElementById("kitchenDisplay");if(!box)return;
 const active=(window.bdCurrentOrders||[]).filter(order=>!["Completed","Voided"].includes(order.status));
 const rank={New:0,Accepted:1,Cooking:2,Ready:3};active.sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9)||new Date(a.created_at)-new Date(b.created_at));
 const cards=active.map(order=>`<article class="kitchenTicket ${String(order.status||"").toLowerCase()}"><header><span>Ticket #${ticketCode(order)}</span><b>${esc(order.status)}</b></header><h2>${esc(order.customer_name||"Customer")}</h2><p>Pickup: ${esc(order.pickup_time||"Now")} • <span class="${isLate(order)?"lateTimer":""}">${isLate(order)?"OVERDUE • ":""}${waitTime(order.created_at)}</span></p><ul>${(order.items||[]).map(item=>`<li><b>${Number(item.quantity||1)>1?`${Number(item.quantity)} × `:""}${esc(item.name)}</b>${item.options?`<small>${esc(item.options)}</small>`:""}${item.notes?`<small>Note: ${esc(item.notes)}</small>`:""}</li>`).join("")}</ul>${order.notes?`<p class="kitchenNote">${esc(order.notes)}</p>`:""}${nextStatus(order.status)?`<button type="button" onclick="changeStatus('${order.id}','${nextStatus(order.status)}')">${statusActionLabel(order.status)}</button>`:""}</article>`).join("");
 box.innerHTML=`<div class="kitchenHeader"><div><span class="eyebrow">KITCHEN DISPLAY</span><b>${active.length?`${active.length} active ticket${active.length===1?"":"s"}`:"Kitchen is clear"}</b><small>Large, simple tickets for cooking. This screen refreshes automatically.</small></div><button type="button" class="secondaryButton" onclick="setAdminView('orders')">ORDER BOARD</button></div><div class="kitchenTickets">${cards||"<div class='kitchenEmpty'>No active orders right now.</div>"}</div>`;
}

function windowMenuItems(){return editableMenuItems.filter(item=>item.available!==false&&menuAvailability[item.item_name]!==false);}
function windowSubtotal(){return Math.max(0,windowSaleCart.reduce((sum,line)=>sum+Number(line.price||0)*Number(line.quantity||1),0)-Number(windowSaleDiscount.amount||0));}
function saveWindowSaleDraft(){
 const name=document.getElementById("windowCustomerName"),phone=document.getElementById("windowCustomerPhone"),payment=document.getElementById("windowPayment");
 if(name)windowSaleDraft.name=name.value;
 if(phone)windowSaleDraft.phone=phone.value;
 if(payment)windowSaleDraft.payment=payment.value;
}
function renderWindowOrder(){
 const box=document.getElementById("windowSale");if(!box)return;
 saveWindowSaleDraft();
 const menuItems=windowMenuItems();
 const categories=[...new Set(menuItems.map(item=>item.category||"Menu"))];
 const items=menuItems.map(item=>{const line=windowSaleCart.find(line=>line.id===item.id);const itemId=encodeURIComponent(item.id);return `<button type="button" class="windowMenuItem ${line?"inCart":""}" onclick="addWindowSaleItem(decodeURIComponent('${itemId}'))" onpointerdown="startWindowItemHold(decodeURIComponent('${itemId}'))" onpointerup="endWindowItemHold()" onpointercancel="endWindowItemHold()" onpointerleave="endWindowItemHold()" oncontextmenu="return false"><span>${esc(item.item_name)}</span><b>$${Number(item.price||0).toFixed(2)}</b><small>${line?`✓ IN ORDER • ${line.quantity} • HOLD TO REMOVE`:esc(item.category||"Menu")}</small></button>`;}).join("");
 const subtotal=windowSubtotal(),tax=subtotal*.0675,total=subtotal+tax;
 const cart=windowSaleCart.length?windowSaleCart.map((line,index)=>`<article class="windowCartLine"><div><b>${esc(line.name)}</b><small>$${Number(line.price).toFixed(2)} each</small></div><div class="quantityControl"><button type="button" onclick="changeWindowSaleQuantity(${index},-1)">−</button><b>${line.quantity}</b><button type="button" onclick="changeWindowSaleQuantity(${index},1)">+</button></div><strong>$${(Number(line.price)*Number(line.quantity)).toFixed(2)}</strong><button type="button" class="removeWindowItem" onclick="removeWindowSaleItem(${index})">×</button></article>`).join(""):`<p class="windowEmpty">Add items from the menu to start a walk-up sale.</p>`;
 const discount=windowSaleDiscount.amount?`<div class="discountLine"><span>Discount / comp — ${esc(windowSaleDiscount.reason)}</span><b>−$${Number(windowSaleDiscount.amount).toFixed(2)}</b><button type="button" onclick="clearWindowDiscount()">×</button></div>`:"";
 box.innerHTML=`<div class="windowTitle"><div><span class="eyebrow">COUNTER POS</span><b>Walk-up / window order</b><small>Cash and card sales are counted with online orders at closeout.</small></div><div class="windowTitleActions"><button type="button" class="secondaryButton" onclick="checkWindowLoyalty()">LOYALTY</button><button type="button" class="secondaryButton" onclick="clearWindowSale()">CLEAR ORDER</button></div></div><div class="windowCustomer"><label>Customer name <input id="windowCustomerName" maxlength="70" value="${esc(windowSaleDraft.name)}" placeholder="Walk-in customer"></label><label>Phone <input id="windowCustomerPhone" inputmode="tel" maxlength="30" value="${esc(windowSaleDraft.phone)}" placeholder="Optional"></label><label>Payment <select id="windowPayment"><option value="">Choose at payment</option>${(typeof BD_PAYMENT_METHODS!=="undefined"?BD_PAYMENT_METHODS:["Cash","Square — Other / Contactless"]).map(method=>`<option value="${esc(method)}" ${windowSaleDraft.payment===method?"selected":""}>${esc(method)}</option>`).join("")}</select></label></div><div class="windowPOSGrid"><div><div class="windowMenuHeader"><b>Menu items</b><small>${categories.map(category=>esc(category)).join(" · ")}</small></div><div class="windowMenuGrid">${items||"<p>Menu is loading. Open the Menu tab once if it does not appear.</p>"}</div><div class="windowAddedNotice">${windowSaleLastAdded?`Last added: <b>${esc(windowSaleLastAdded)}</b>`:"Tap an item to add it to this order."}<small>Tap adds one. Hold an item to remove it from the order.</small></div></div><div class="windowCart"><h2>Current sale <small>${windowSaleCart.reduce((n,line)=>n+Number(line.quantity||0),0)} item${windowSaleCart.reduce((n,line)=>n+Number(line.quantity||0),0)===1?"":"s"} • $${total.toFixed(2)}</small></h2><div class="windowCartLines">${cart}</div>${discount}<button type="button" class="discountButton" onclick="applyWindowDiscount()">ADD DISCOUNT / COMP</button><div class="windowTotals"><span>Subtotal <b>$${subtotal.toFixed(2)}</b></span><span>NC tax (6.75%) <b>$${tax.toFixed(2)}</b></span><strong>Total <b>$${total.toFixed(2)}</b></strong></div><div class="windowActions"><button type="button" class="secondaryButton" onclick="submitWindowSale(false)" ${windowSaleCart.length?"":"disabled"}>SEND TO KITCHEN</button><button type="button" onclick="submitWindowSale(true)" ${windowSaleCart.length?"":"disabled"}>COMPLETE SALE</button></div><small>Send to Kitchen creates a new kitchen ticket. Complete Sale is for a finished walk-up order and requires a payment method.</small></div></div>`;
}
function addWindowSaleItem(id){if(windowSaleHoldHandled){windowSaleHoldHandled=false;return;}const item=editableMenuItems.find(item=>item.id===id);if(!item||item.available===false)return;const line=windowSaleCart.find(line=>line.id===id);if(line)line.quantity++;else windowSaleCart.push({id:item.id,name:item.item_name,price:Number(item.price),quantity:1});windowSaleLastAdded=item.item_name;renderWindowOrder();}
function startWindowItemHold(id){clearTimeout(windowSaleHoldTimer);windowSaleHoldHandled=false;windowSaleHoldTimer=setTimeout(()=>{const item=editableMenuItems.find(item=>item.id===id);const index=windowSaleCart.findIndex(line=>line.id===id);if(index<0||!item)return;windowSaleCart.splice(index,1);windowSaleLastAdded=`Removed ${item.item_name}`;windowSaleHoldHandled=true;renderWindowOrder();},650);}
function endWindowItemHold(){clearTimeout(windowSaleHoldTimer);}
function changeWindowSaleQuantity(index,amount){const line=windowSaleCart[index];if(!line)return;line.quantity+=amount;if(line.quantity<1)windowSaleCart.splice(index,1);renderWindowOrder();}
function removeWindowSaleItem(index){windowSaleCart.splice(index,1);renderWindowOrder();}
function clearWindowSale(){if(!windowSaleCart.length||confirm("Clear this walk-up order?")){windowSaleCart=[];windowSaleDraft={name:"",phone:"",payment:""};windowSaleDiscount={amount:0,reason:""};windowSaleLastAdded="";renderWindowOrder();}}
async function applyWindowDiscount(){
 if(!windowSaleCart.length){alert("Add at least one menu item before applying a discount or comp.");return;}
 if(!await requireManagerApproval("add a discount or comp"))return;
 const subtotal=windowSaleCart.reduce((sum,line)=>sum+Number(line.price||0)*Number(line.quantity||1),0);
 const amount=Number(prompt(`Discount amount before tax (up to $${subtotal.toFixed(2)}):`)||0);
 if(!Number.isFinite(amount)||amount<=0){alert("Enter a discount amount greater than zero.");return;}
 if(amount>subtotal){alert("The discount cannot be more than the items in this sale.");return;}
 const reason=prompt("Reason for discount or comp:");
 if(!reason?.trim()){alert("A reason is required.");return;}
 windowSaleDiscount={amount,reason:reason.trim()};
 renderWindowOrder();
 alert(`Discount applied: −$${amount.toFixed(2)}.`);
}
function clearWindowDiscount(){windowSaleDiscount={amount:0,reason:""};renderWindowOrder();}
async function submitWindowSale(completeNow){
 if(!windowSaleCart.length)return;
 saveWindowSaleDraft();
 const payment=document.getElementById("windowPayment")?.value||"";
 if(completeNow&&!payment){alert("Choose Cash or the Square payment type before completing this sale.");return;}
 const name=document.getElementById("windowCustomerName")?.value.trim()||"Walk-in Customer";
 const phone=document.getElementById("windowCustomerPhone")?.value.trim()||"Window sale";
 const subtotal=windowSubtotal(),total=Number((subtotal*1.0675).toFixed(2));
 const order={id:"BD"+Date.now().toString(36).toUpperCase(),customer_name:name,phone,pickup_time:"Now",notes:`Walk-up window order${windowSaleDiscount.amount?` • DISCOUNT / COMP: $${Number(windowSaleDiscount.amount).toFixed(2)} — ${windowSaleDiscount.reason}`:""}`,items:[...windowSaleCart.map(line=>({name:line.name,price:Number(line.price),quantity:Number(line.quantity),options:"",notes:""})),...(windowSaleDiscount.amount?[{name:"Discount / Comp",price:-Number(windowSaleDiscount.amount),quantity:1,options:"",notes:windowSaleDiscount.reason}]:[])],total,status:completeNow?"Completed":"New",payment_method:payment||null};
 try{await bdCreateStaffOrder(order);windowSaleCart=[];windowSaleDraft={name:"",phone:"",payment:""};windowSaleDiscount={amount:0,reason:""};windowSaleLastAdded="";await loadOrders();renderWindowOrder();alert(completeNow?`Walk-up sale #${ticketCode(order)} completed and added to today’s cash-out.`:`Window ticket #${ticketCode(order)} sent to the kitchen.`);if(!completeNow)setAdminView("orders");}
 catch(e){alert(e?.status===401||e?.status===403?"Your staff session expired. Sign in again, then save this window order.":"Could not save this window order. Check the connection and try again.");}
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
  let items=[];
  try{items=await bdGetMenuItems();}catch(_){items=[];}
  if(items.length){editableMenuItems=items;if(!localStorage.getItem("bdSampleMenuTemplate"))localStorage.setItem("bdSampleMenuTemplate",JSON.stringify(items));}
  const rows=items.length?items:await bdGetMenuAvailability();
  menuAvailability=Object.fromEntries((rows||[]).map(r=>[r.item_name,r.available!==false]));
  const box=document.querySelector("#menuAvailabilityControls");
  const displayItems=editableMenuItems.length?editableMenuItems:adminMenuItems.map((name,index)=>({id:"legacy-"+index,item_name:name,category:"Current menu",description:"",price:"",available:menuAvailability[name]!==false,sort_order:index}));
  const tabs=document.getElementById("menuFilterTabs");const categories=["All",...new Set(displayItems.map(x=>x.category||"Menu item"))];if(!categories.includes(currentMenuCategory))currentMenuCategory="All";
  if(tabs)tabs.innerHTML=categories.map(category=>`<button type="button" class="${category===currentMenuCategory?"active":""}" onclick="setMenuCategory(decodeURIComponent(\'${encodeURIComponent(category)}\'))">${esc(category)}</button>`).join("");
  const visibleItems=displayItems.filter(item=>currentMenuCategory==="All"||item.category===currentMenuCategory);
  if(box) box.innerHTML=visibleItems.map(item=>{
   const available=item.available!==false&&menuAvailability[item.item_name]!==false;
   const price=Number.isFinite(Number(item.price))&&item.price!==""?`$${Number(item.price).toFixed(2)}`:"";
   return `<article class="menuAdminItem ${available?"available":"soldout"}"><div class="menuItemInfo"><span class="menuCategory">${esc(item.category||"Menu item")}</span><strong>${esc(item.item_name)}</strong>${item.description?`<small>${esc(item.description)}</small>`:""}</div><div class="menuItemActions"><b>${price}</b><button type="button" class="availabilityButton" onclick="toggleMenuItem(decodeURIComponent(\'${encodeURIComponent(item.item_name)}\'),this)">${available?"AVAILABLE":"SOLD OUT"}</button><button type="button" class="editItemButton" onclick="openMenuItemEditor(decodeURIComponent(\'${encodeURIComponent(item.id)}\'))">EDIT</button><details class="menuMore"><summary>MORE</summary><div><button type="button" onclick="duplicateMenuItem(decodeURIComponent(\'${encodeURIComponent(item.id)}\'))">Duplicate</button><button type="button" onclick="moveMenuItem(decodeURIComponent(\'${encodeURIComponent(item.id)}\'),-1)">Move up</button><button type="button" onclick="moveMenuItem(decodeURIComponent(\'${encodeURIComponent(item.id)}\'),1)">Move down</button><button type="button" class="deleteItemButton" onclick="removeMenuItem(decodeURIComponent(\'${encodeURIComponent(item.id)}\'))">Delete</button></div></details></div></article>`;
   }).join("");
  updateSetupChecklist();
  renderWindowOrder();
 }catch(e){
  const box=document.querySelector("#menuAvailabilityControls");
  if(box) box.textContent="Menu controls unavailable.";
 }
}
function setMenuCategory(category){currentMenuCategory=category;loadMenuAvailability();}
async function duplicateMenuItem(id){const item=editableMenuItems.find(x=>x.id===id);if(!item)return;const duplicate={...item,id:"item-"+Date.now(),item_name:item.item_name+" Copy",sort_order:Number(item.sort_order||0)+.5};try{await bdSaveMenuItem(duplicate);await loadMenuAvailability();}catch(e){alert("Could not duplicate that menu item.");}}
async function moveMenuItem(id,direction){const current=editableMenuItems.find(x=>x.id===id);if(!current)return;const same=editableMenuItems.filter(x=>x.category===current.category).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const index=same.findIndex(x=>x.id===id),swap=same[index+direction];if(!swap)return;const old=current.sort_order;current.sort_order=swap.sort_order;swap.sort_order=old;try{await bdSaveMenuItem(current);await bdSaveMenuItem(swap);await loadMenuAvailability();}catch(e){alert("Could not move that menu item.");}}
async function restoreSampleMenu(){
 const saved=localStorage.getItem("bdSampleMenuTemplate");if(!saved){alert("Open the upgraded menu once before using Restore Sample Menu.");return;}
 if(!confirm("Restore the original sample menu? This removes menu changes made after the template was first opened on this device."))return;
 try{for(const item of editableMenuItems)await bdDeleteMenuItem(item.id);for(const item of JSON.parse(saved))await bdSaveMenuItem(item);await loadMenuAvailability();alert("Sample menu restored.");}catch(e){alert("Could not restore the sample menu.");}
}

function openMenuItemEditor(id=""){
 const existing=editableMenuItems.find(x=>x.id===id)||{};
 if(id&&id.startsWith("legacy-")){alert("The one-time menu upgrade has not been installed yet. Once it is installed, every item can be edited and removed here.");return;}
 const dialog=document.createElement("div");dialog.className="menuEditorModal";
 dialog.innerHTML=`<section><button class="closeEditor" aria-label="Close">×</button><span class="eyebrow">MENU BUILDER</span><h2>${id?"Edit menu item":"Add menu item"}</h2><label>Category<input id="editorCategory" value="${esc(existing.category||"Hot Dawgs")}" placeholder="Hot Dawgs"></label><label>Item name<input id="editorName" value="${esc(existing.item_name||"")}" placeholder="Item name"></label><label>Description<textarea id="editorDescription" placeholder="Short description">${esc(existing.description||"")}</textarea></label><label>Price<input id="editorPrice" value="${existing.price??""}" inputmode="decimal" placeholder="0.00"></label><label class="availabilityCheck"><input id="editorAvailable" type="checkbox" ${existing.available!==false?"checked":""}> Available to order</label><div class="editorButtons"><button type="button" class="secondaryButton closeEditor">CANCEL</button><button type="button" id="saveMenuItemButton">SAVE MENU ITEM</button></div></section>`;
 document.body.append(dialog);
 const close=()=>dialog.remove();dialog.querySelectorAll(".closeEditor").forEach(b=>b.addEventListener("click",close));
 dialog.addEventListener("click",e=>{if(e.target===dialog)close();});
 dialog.querySelector("#saveMenuItemButton").addEventListener("click",async()=>{
  const category=dialog.querySelector("#editorCategory").value.trim(),item_name=dialog.querySelector("#editorName").value.trim(),description=dialog.querySelector("#editorDescription").value.trim(),price=Number(dialog.querySelector("#editorPrice").value);
  if(!category||!item_name||!Number.isFinite(price)||price<0){alert("Enter a category, item name, and valid price.");return;}
  const item={id:id||("item-"+Date.now()),category,item_name,description,price,available:dialog.querySelector("#editorAvailable").checked,sort_order:existing.sort_order??editableMenuItems.length};
  if(!await requireManagerApproval(id?"change a menu item":"add a menu item"))return;
  try{await bdSaveMenuItem(item);close();await loadMenuAvailability();}catch(e){alert("Could not save the menu item. Run the menu upgrade once in Supabase, then try again.");}
 });
}
async function removeMenuItem(id){
 if(!id||id.startsWith("legacy-")){alert("The one-time menu upgrade has not been installed yet.");return;}
 const item=editableMenuItems.find(x=>x.id===id);if(!item||!confirm(`Remove ${item.item_name} from the menu?`))return;
 if(!await requireManagerApproval("remove a menu item"))return;
 try{await bdDeleteMenuItem(id);await loadMenuAvailability();}catch(e){alert("Could not remove that menu item.");}
}

async function toggleMenuItem(name,button){
 const item=editableMenuItems.find(x=>x.item_name===name);
 const available=item?item.available!==false:menuAvailability[name]!==false;
 if(button){button.disabled=true;button.textContent="SAVING…";}
 try{
  if(item){
   item.available=!available;
   await bdSaveMenuItem(item);
  }else{
   await bdSetMenuAvailability(name,!available);
  }
  // Keep the older availability list synchronized when it is available, but
  // never let that older list prevent the current menu from refreshing.
  if(item){try{await bdSetMenuAvailability(name,!available);}catch(_){}}
  await loadMenuAvailability();
 }catch(e){
  if(button){button.disabled=false;button.textContent=available?"AVAILABLE":"SOLD OUT";}
  alert(e?.status===401||e?.status===403?"Your staff sign-in expired. Sign in again, then change this item.":"Could not update that menu item.");
 }
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
  if(!firstOrderLoad&&newIds.length){ playOrderAlert();showNewOrderBanner(newIds.length); }
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
  if(typeof renderCloseout==="function")renderCloseout();
  renderInventoryPanel();
  if(activeAdminView==="kitchen")renderKitchenDisplay();

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
      <div><b class="ticketLabel">Ticket #${ticketCode(o)}</b> <a class="phoneLink" href="tel:${esc(String(o.phone||'').replace(/[^+\d]/g,''))}">${esc(o.phone)}</a> • Pickup: ${esc(o.pickup_time)} • <span class="serviceTimer ${isLate(o)?"lateTimer":""}">${isLate(o)?"OVERDUE • ":""}${waitTime(o.created_at)}</span></div>
     </div>
     <strong>$${Number(o.total).toFixed(2)}</strong>
    </div>

    <div class="status status-${esc(o.status)}">
     ${esc(o.status)}
    </div>

    <div class="items">
     ${(o.items||[]).map(i=>`
      <div class="orderItem">
       <b>${Number(i.quantity)>1?`${Number(i.quantity)} × `:""}${esc(i.name)}</b>
       ${i.options?`<small>${esc(i.options)}</small>`:""}
       ${i.notes?`<small>Note: ${esc(i.notes)}</small>`:""}
       <span>$${(Number(i.price||0)*Math.max(1,Number(i.quantity)||1)).toFixed(2)}</span>
      </div>
     `).join("")}
    </div>

    ${o.notes?`<p><b>Order note:</b> ${esc(o.notes)}</p>`:""}

    ${canSpeakKitchenOrders()?`<div class="speechActions"><button type="button" onclick="speakKitchenOrder(\'${o.id}\')">🔊 READ ORDER</button>${(o.items||[]).map((i,n)=>`<button type="button" onclick="speakKitchenOrder(\'${o.id}\',${n})">Read Item ${n+1}</button>`).join("")}</div>`:""}

    ${typeof bdPaymentSelector==="function"?bdPaymentSelector(o):""}\n    ${nextStatus(o.status)?`<button class="nextStatus" onclick="changeStatus('${o.id}','${nextStatus(o.status)}')">${statusActionLabel(o.status)}</button>`:""}

    <select onchange="changeStatus('${o.id}',this.value)">
     ${statuses.map(s=>
      `<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`
     ).join("")}
    </select>

    <div class="orderUtility"><button type="button" onclick="printOrderReceipt('${o.id}')">PRINT RECEIPT</button>${o.status==="Ready"?`<button type="button" class="readyText" onclick="textCustomerReady('${o.id}')">TEXT READY</button>`:""}<button type="button" onclick="repeatOrderAtWindow('${o.id}')">REPEAT AT WINDOW</button>${o.status==="Completed"?`<button type="button" class="voidOrder" onclick="voidOrder('${o.id}')">VOID / REFUND</button>`:""}<button type="button" class="deleteOrderButton" data-order-id="${o.id}" onclick="deleteOrder('${o.id}',this)">Delete Order</button></div>
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
function canSpeakKitchenOrders(){return !!(window.BakersDawgsAndroid&&typeof window.BakersDawgsAndroid.speak==="function")||("speechSynthesis" in window);}
function updateSpeechReadbackUI(){
 const supported=canSpeakKitchenOrders();
 document.querySelectorAll("button[onclick='repeatLastOrder()'],button[onclick='stopOrderSpeech()']").forEach(button=>button.hidden=!supported);
 if(!supported){
  const status=document.getElementById("voiceAssistantStatus");
  if(status)status.textContent="Voice read-back is available in the Baker's Dawgs Admin app.";
 }
}
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
 const text=orderSpeechText(o,itemIndex);
 if(window.BakersDawgsAndroid&&typeof window.BakersDawgsAndroid.speak==="function"){
  window.BakersDawgsAndroid.speak(text);
  lastSpokenOrderId=o.id;
  return;
 }
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);
 const voice=bestKitchenVoice(); if(voice){u.voice=voice;u.lang=voice.lang||"en-US";}
 u.rate=.88; u.pitch=1; u.volume=1;
 speechSynthesis.speak(u);
 lastSpokenOrderId=o.id;
}
function repeatLastOrder(){
 if(!lastSpokenOrderId){alert("Tap Read Order on an order first.");return;}
 speakKitchenOrder(lastSpokenOrderId);
}
function stopOrderSpeech(){ if(window.BakersDawgsAndroid&&typeof window.BakersDawgsAndroid.stopSpeaking==="function") window.BakersDawgsAndroid.stopSpeaking(); if("speechSynthesis" in window) speechSynthesis.cancel(); }
let kitchenRecognition=null,kitchenListening=false,kitchenPauseTimer=null,kitchenStarting=false,kitchenRecognizing=false;
function voiceStatus(msg){const el=document.querySelector("#voiceAssistantStatus");if(el)el.textContent=msg;}
function onNativeVoiceStatus(msg){voiceStatus(msg);}
function onNativeVoiceError(msg){kitchenListening=false;voiceStatus(msg);}
function onNativeVoiceCommand(transcript){handleKitchenCommand(transcript);}
function handleKitchenCommand(transcript){
 const said=String(transcript||"").toLowerCase().trim();
 if(/stop listening|pause baker|baker pause|pause assistant/.test(said)){stopKitchenListening("Voice assistant paused.");return;}
 if(/(?:pause|stop) (?:for )?(10|ten|30|thirty) minutes?/.test(said)){
  pauseKitchenListening(/30|thirty/.test(said)?30:10);return;
 }
 if(/repeat (that|last) order|repeat order|read (the )?order|repeat everything/.test(said)){repeatLastOrder();return;}
 const m=said.match(/(?:read|repeat) (?:item|hot dog|hot dawg) (one|two|three|four|five|\d+)/);
 if(m&&lastSpokenOrderId){const words={one:1,two:2,three:3,four:4,five:5};const n=words[m[1]]||Number(m[1]);speakKitchenOrder(lastSpokenOrderId,n-1);}
}
function startKitchenListening(){
 clearTimeout(kitchenPauseTimer);
 if(window.BakersDawgsAndroid&&typeof window.BakersDawgsAndroid.startListening==="function"){
  kitchenListening=true;voiceStatus("Starting microphone…");window.BakersDawgsAndroid.startListening();return;
 }
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){voiceStatus("Voice commands are unavailable in this browser. Read Order buttons may still work.");return;}
 if(!kitchenRecognition){
  kitchenRecognition=new SR(); kitchenRecognition.lang="en-US"; kitchenRecognition.continuous=true; kitchenRecognition.interimResults=false;
  kitchenRecognition.onresult=e=>Array.from(e.results).slice(e.resultIndex).forEach(r=>handleKitchenCommand(r[0].transcript));
  kitchenRecognition.onstart=()=>{kitchenStarting=false;kitchenRecognizing=true;};
  kitchenRecognition.onend=()=>{kitchenStarting=false;kitchenRecognizing=false;if(kitchenListening)setTimeout(()=>startKitchenListening(),250);};
  kitchenRecognition.onerror=e=>{if(e.error==="not-allowed"){kitchenListening=false;voiceStatus("Microphone permission is off.");}};
 }
 if(kitchenRecognizing||kitchenStarting){voiceStatus("Already listening for kitchen commands");return;}
 kitchenListening=true;kitchenStarting=true;
 try{kitchenRecognition.start();voiceStatus("Listening for kitchen commands");}
 catch(e){kitchenStarting=false;if(String(e?.message||"").includes("already started")){kitchenRecognizing=true;voiceStatus("Already listening for kitchen commands");}else voiceStatus("Could not start microphone: "+e.message);}
}
function stopKitchenListening(message="Voice assistant paused."){
 kitchenListening=false;kitchenStarting=false;clearTimeout(kitchenPauseTimer);
 if(window.BakersDawgsAndroid&&typeof window.BakersDawgsAndroid.stopListening==="function")window.BakersDawgsAndroid.stopListening();
 if(kitchenRecognition){try{kitchenRecognition.stop();}catch(e){}}
 voiceStatus(message);
}
function pauseKitchenListening(minutes){
 stopKitchenListening(`Paused for ${minutes} minutes`);
 kitchenPauseTimer=setTimeout(()=>startKitchenListening(),minutes*60000);
}


async function changeStatus(id,status){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));
 if(status==="Voided"){await voidOrder(id);return;}
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

async function voidOrder(id){
 const order=(window.bdCurrentOrders||[]).find(o=>String(o.id)===String(id));if(!order)return;
 if(!await requireManagerApproval("void or refund this order"))return;
 const reason=prompt("Why is this order being voided or refunded? (Required)");if(!reason?.trim()){alert("A reason is required so the closeout remains clear.");return;}
 if(!confirm(`Void ticket #${ticketCode(order)}? It will stay in the record but will no longer count as completed sales.`))return;
 try{await bdUpdateOrder(id,{status:"Voided",notes:`${order.notes||""}${order.notes?" • ":""}VOID / REFUND: ${reason.trim()}`});await loadOrders();}
 catch(e){alert("Could not void this order.");}
}

async function deleteOrder(id,button){
 if(!confirm("Delete this order permanently? This cannot be undone.")) return;
 if(button){button.disabled=true;button.textContent="Deleting…";}
 try{
  // The board can stay open for hours. Refresh staff credentials immediately
  // before the destructive action instead of using an old access token.
  if(!await bdRefreshSession()){
   const error=new Error("Your staff sign-in expired. Sign in again, then delete the order.");
   error.status=401;
   throw error;
  }
  await bdDeleteOrder(id);
  window.bdCurrentOrders=(window.bdCurrentOrders||[]).filter(order=>String(order.id)!==String(id));
  await loadOrders();
  alert("Order deleted.");
 }catch(e){
  if(button){button.disabled=false;button.textContent="Delete Order";}
  if(e?.status===401||e?.status===403){alert("Your staff sign-in expired. Sign in again, then delete the order.");}
  else alert(e?.message||"Could not delete order. Check your connection and try again.");
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
setBiometricButtonLabels();
