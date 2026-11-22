// Public customer tools. Receipt references stay on this device, never in URLs.
function customerText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function customerReceipt(){try{return JSON.parse(localStorage.getItem('bdLastCustomerReceipt')||'null');}catch{return null;}}
function customerPhone(value){const digits=String(value||'').replace(/\D/g,'');return /^1\d{10}$/.test(digits)?digits.slice(1):/^\d{10}$/.test(digits)?digits:null;}
function customerError(error,fallback){try{const data=JSON.parse(error.message);return data.message||fallback;}catch{return fallback;}}
function comboStyle(name){const n=String(name).toLowerCase();return /carolina/.test(n)?'carolina':/sauerkraut/.test(n)?'sauerkraut':/chili.*(?:cheese|cheez)/.test(n)?'cheese':/chili.*onion/.test(n)?'onion':/relish/.test(n)?'relish':/slaw/.test(n)?'slaw':/loaded/.test(n)?'loaded':null;}
function matchingCombo(index){
 const item=menu[index],style=comboStyle(item?.[1]);if(item?.[0]!=='Hot Dawgs'||!style)return -1;
 return menu.findIndex(x=>x[0]==='Hot Dawg Combos'&&comboStyle(x[1])===style&&menuAvailability[x[1]]!==false);
}
function comboOffer(){
 const index=cart.findIndex(line=>matchingCombo(line.i)>=0);if(index<0)return '';
 const line=cart[index],comboIndex=matchingCombo(line.i),difference=menu[comboIndex][3]-menu[line.i][3];
 if(difference<=0)return '';
 return `<aside class="comboOffer"><span class="eyebrow">MAKE IT A MEAL</span><h3>Add chips & a canned drink</h3><p>Upgrade one ${customerText(menu[line.i][1])} to its combo for ${money(difference)} more + tax.</p><button type="button" class="checkout" onclick="upgradeCustomerCombo(${index})">UPGRADE ONE TO A COMBO</button></aside>`;
}
function upgradeCustomerCombo(index){
 const line=cart[index];if(!line)return;const combo=matchingCombo(line.i);
 if(combo<0)return alert('That combo is unavailable right now.');
 line.i=combo;save();openCart();
}
function prepareRepeatItems(){
 const receipt=customerReceipt();if(!receipt)return [];
 const old=receipt.repeatItems||receipt.items?.map(item=>({name:item.name,tops:String(item.options||'').split(' • ')[0].split(', ').filter(Boolean),notes:item.notes||'',extra:0}))||[];
 return old.slice(0,50).map(item=>{
  const index=menu.findIndex(x=>x[1]===item.name&&(!item.category||x[0]===item.category));
  return {...item,index,available:index>=0&&menuAvailability[item.name]!==false};
 });
}
function showRepeatOrder(){
 const receipt=customerReceipt();if(!receipt){modalBody.innerHTML='<h2>Order my usual</h2><p>Your last order will be saved on this device after you place a pickup order.</p><button class="checkout" onclick="closeModal();goMenu()">BROWSE THE MENU</button>';openModal();return;}
 const items=prepareRepeatItems(),available=items.filter(x=>x.available),subtotal=available.reduce((sum,x)=>sum+menu[x.index][3]+Number(x.extra||0),0);
 modalBody.innerHTML=`<h2>Order my usual</h2><p>Review your last order at today’s prices. Items are added to your current cart.</p>${items.map(x=>`<div class="cartrow"><span>${customerText(x.name)}<small>${customerText((x.tops||[]).join(', '))}</small></span><b>${x.available?money(menu[x.index][3]+Number(x.extra||0)):'Unavailable'}</b></div>`).join('')}<p class="notice">Unavailable or removed items will be skipped. Review toppings and quantities in your cart before checkout.</p><div class="total">Total with tax <b>${money(totalWithTax(subtotal))}</b></div><button class="checkout" onclick="confirmRepeatOrder()" ${available.length?'':'disabled'}>ADD ${available.length} AVAILABLE ITEM${available.length===1?'':'S'} TO ORDER</button>`;
 openModal();
}
function confirmRepeatOrder(){
 if(orderingStatusKnown&&!orderingOpen)return showOrderingPaused();
 const available=prepareRepeatItems().filter(x=>x.available);
 if(!available.length)return alert('Your previous items are unavailable right now.');
 for(const x of available)cart.push({i:x.index,tops:(x.tops||[]).filter(t=>toppings.includes(t)),notes:x.notes||'',extra:Number(x.extra||0)});
 save();openCart();
}
function showRewards(){
 modalBody.innerHTML=`<h2>Your Dawg Rewards</h2><p>Buy 5 hot dogs, get 1 free. Enter the phone number used with your orders.</p><form onsubmit="event.preventDefault();checkCustomerRewards()"><label class="label" for="rewardPhone">Phone number</label><input class="field" id="rewardPhone" type="tel" autocomplete="tel" value="${customerText(lastCustomer.phone||'')}" required><button class="checkout" id="rewardLookupButton">CHECK MY REWARDS</button></form><div id="customerRewardsResult" role="status"></div>`;openModal();
}
let rewardLookupBusy=false;
async function checkCustomerRewards(){
 if(rewardLookupBusy)return;const phone=customerPhone(document.getElementById('rewardPhone')?.value),result=document.getElementById('customerRewardsResult');
 if(!phone){result.textContent='Enter a valid 10-digit phone number.';return;}
 rewardLookupBusy=true;const button=document.getElementById('rewardLookupButton');button.disabled=true;result.textContent='Checking your rewards…';
 try{const r=await bdCustomerRewards(phone),progress=Math.max(0,Math.min(4,Number(r.progress)||0)),rewards=Math.max(0,Number(r.rewards)||0);
 result.innerHTML=`<div class="rewardCard"><b>${progress} of 5 toward your next free hot dog</b><div class="rewardStamps" aria-hidden="true">${Array.from({length:5},(_,i)=>`<span class="${i<progress?'earned':''}">🌭</span>`).join('')}</div><strong>${rewards} free hot dog${rewards===1?'':'s'} available</strong><p>Show your phone number at pickup to redeem. Paid, completed orders count toward rewards.</p></div>`;
 }catch{result.textContent='Rewards could not be loaded. Please try again or ask us at pickup.';}finally{rewardLookupBusy=false;button.disabled=false;}
}
let customerTrackingTimer=null,customerTrackingGeneration=0;
function stopCustomerTracking(){clearInterval(customerTrackingTimer);customerTrackingTimer=null;customerTrackingGeneration++;}
function showOrderProgress(){
 const receipt=customerReceipt();stopCustomerTracking();
 modalBody.innerHTML=`<h2>Track your pickup</h2><p>Check the kitchen’s latest update. Your full order reference is saved on this device after checkout.</p><form onsubmit="event.preventDefault();startCustomerTracking()"><label class="label" for="trackingReference">Full order reference</label><input class="field" id="trackingReference" value="${customerText(receipt?.id||'')}" placeholder="Full reference from your receipt" required><label class="label" for="trackingPhone">Phone number on the order</label><input class="field" id="trackingPhone" type="tel" autocomplete="tel" value="${customerText(receipt?.phone||lastCustomer.phone||'')}" required><button class="checkout" id="trackingButton">CHECK ORDER STATUS</button></form><div id="customerTrackingResult" role="status" aria-live="polite"></div>`;openModal();
 if(receipt?.id&&receipt?.phone)startCustomerTracking();
}
function startCustomerTracking(){
 stopCustomerTracking();const id=document.getElementById('trackingReference')?.value.trim(),phone=customerPhone(document.getElementById('trackingPhone')?.value),result=document.getElementById('customerTrackingResult');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')||!phone){result.textContent='Enter your full order reference and a valid phone number.';return;}
 result.textContent='Checking the kitchen’s latest update…';
 const generation=customerTrackingGeneration;let busy=false;
 const refresh=async()=>{
  if(busy||generation!==customerTrackingGeneration||document.hidden||!document.getElementById('customerTrackingResult'))return;
  busy=true;document.getElementById('trackingButton').disabled=true;
  try{const data=await bdCustomerProgress(id,phone);if(generation!==customerTrackingGeneration)return;
   if(!data){result.textContent='No matching order found. Check your full reference and phone number.';clearInterval(customerTrackingTimer);return;}
   const labels={New:'Received',Accepted:'Accepted',Cooking:'Cooking',Ready:'Ready for pickup',Completed:'Picked up',Voided:'Order cancelled'},states=['New','Accepted','Cooking','Ready','Completed'],current=states.indexOf(data.status);
   result.innerHTML=`<div class="trackingCard"><h3>${customerText(labels[data.status]||'Status unavailable')}</h3>${data.status==='Voided'?'<p>This order was cancelled. Call us if you need help.</p>':`<ol class="trackingSteps">${states.map((s,i)=>`<li class="${i<=current?'reached':''}" ${i===current?'aria-current="step"':''}>${labels[s]}</li>`).join('')}</ol>`}<p>Pickup time: <b>${customerText(data.pickup||'Ask the stand')}</b></p><small>Last checked ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}. Updates every 15 seconds.</small></div>`;
   if(['Ready','Completed','Voided'].includes(data.status)){
    if(data.status==='Completed'||data.status==='Voided')clearInterval(customerTrackingTimer);
    if(data.status==='Completed')result.insertAdjacentHTML('beforeend','<button class="checkout" onclick="showCustomerReviewForm()">LEAVE A REVIEW</button>');
   }
  }catch{if(generation===customerTrackingGeneration)result.textContent='Could not refresh the order. Retrying shortly. You can also call (828) 205-1139.';}
  finally{busy=false;const b=document.getElementById('trackingButton');if(b)b.disabled=false;}
 };
 refresh();customerTrackingTimer=setInterval(refresh,15000);
}
function showCustomerReviewForm(){
 const receipt=customerReceipt(),ref=document.getElementById('trackingReference')?.value||receipt?.id||'',phone=document.getElementById('trackingPhone')?.value||receipt?.phone||lastCustomer.phone||'';stopCustomerTracking();
 modalBody.innerHTML=`<h2>How was your Dawg?</h2><p>Reviews are checked against completed orders and reviewed before publication. Your display name and review will be public if approved.</p><form onsubmit="event.preventDefault();submitCustomerReview()"><label class="label" for="reviewReference">Full order reference</label><input class="field" id="reviewReference" value="${customerText(ref)}" required><label class="label" for="reviewPhone">Phone number on the order (kept private)</label><input class="field" id="reviewPhone" type="tel" value="${customerText(phone)}" required><label class="label" for="reviewName">Public display name</label><input class="field" id="reviewName" maxlength="50" required placeholder="Example: Robbie A."><label class="label" for="reviewRating">Your rating</label><select class="field" id="reviewRating" required><option value="">Choose a rating</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${n} star${n===1?'':'s'}</option>`).join('')}</select><label class="label" for="reviewBody">Your review</label><textarea class="field" id="reviewBody" minlength="10" maxlength="1000" required></textarea><button class="checkout" id="reviewSubmitButton">SUBMIT FOR REVIEW</button></form><p id="reviewSubmitResult" role="status"></p>`;openModal();
}
let customerReviewBusy=false;
async function submitCustomerReview(){
 if(customerReviewBusy)return;const button=document.getElementById('reviewSubmitButton'),result=document.getElementById('reviewSubmitResult');
 const payload={receipt_id:document.getElementById('reviewReference').value.trim(),customer_phone:document.getElementById('reviewPhone').value,review_name:document.getElementById('reviewName').value.trim(),review_rating:Number(document.getElementById('reviewRating').value),review_body:document.getElementById('reviewBody').value.trim()};
 if(!customerPhone(payload.customer_phone)||!/^[-0-9a-f]{36}$/i.test(payload.receipt_id)){result.textContent='Enter your full order reference and valid phone number.';return;}
 customerReviewBusy=true;button.disabled=true;
 try{await bdSubmitCustomerReview(payload);result.textContent='Thank you! Your review was submitted for approval.';button.textContent='REVIEW SUBMITTED';}
 catch(e){result.textContent=customerError(e,'Could not submit your review. Please try again.');button.disabled=false;}
 finally{customerReviewBusy=false;}
}
function validFoodPhoto(src){return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(src||''));}
async function loadCustomerShowcase(){
 const gallery=document.getElementById('customerPhotoGallery'),reviews=document.getElementById('customerReviewList');
 const results=await Promise.allSettled([bdLoadShowcase(),bdLoadCustomerReviews()]);
 if(gallery&&results[0].status==='fulfilled'){
  const photos=results[0].value.filter(p=>validFoodPhoto(p.src)).slice(0,6);gallery.closest('section').hidden=!photos.length;
  gallery.innerHTML=photos.map(p=>`<figure><img src="${p.src}" alt="${customerText(p.caption||"Baker’s Dawgs food photo")}" loading="lazy"><figcaption>${customerText(p.caption||'Fresh from our stand')}</figcaption></figure>`).join('');
  const featured=photos.find(p=>p.featured);if(featured){const hero=document.querySelector('.classicPhoto');hero.style.backgroundImage=`url("${featured.src}")`;hero.style.backgroundSize='cover';hero.setAttribute('aria-label',featured.caption||'Our Carolina Classic');}
 }
 if(reviews){
  if(results[1].status==='fulfilled'&&results[1].value.length)reviews.innerHTML=results[1].value.slice(0,6).map(r=>`<article class="customerReview"><div aria-label="${Number(r.rating)} out of 5 stars" class="reviewStars">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||1)))}</div><blockquote>${customerText(r.body)}</blockquote><b>${customerText(r.display_name)}</b><small>Verified completed order</small></article>`).join('');
  else reviews.innerHTML='<p>Enjoyed your visit? Share your experience after pickup.</p>';
 }
}
loadCustomerShowcase();
