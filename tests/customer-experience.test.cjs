const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function harness(t){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://bakersdawgs.com',runScripts:'outside-only',pretendToBeVisual:true});t.after(()=>dom.window.close());const w=dom.window;
 w.alert=()=>{};w.bdGetBusinessBranding=async()=>null;w.bdGetRestaurantSettings=async()=>({ordering_open:true,prep_minutes:20});w.bdGetMenuAvailability=async()=>[];w.bdGetMenuItems=async()=>[];w.bdLoadShowcase=async()=>[];w.bdLoadCustomerReviews=async()=>[];w.bdCustomerRewards=async()=>({progress:3,rewards:1});w.bdCustomerProgress=async()=>({status:'Cooking',pickup:'12:30'});
 w.eval(fs.readFileSync('app.js','utf8')+'\n'+fs.readFileSync('customer-experience.js','utf8')+'\nwindow.state={get trackingTimer(){return customerTrackingTimer},get cart(){return cart},get menu(){return menu},setMenu(m){menu=m},setAvailability(v){menuAvailability=v},push(x){cart.push(x)}}');return w;
}
test('repeat ordering maps saved names to current prices, skips unavailable items and retains toppings',t=>{
 const w=harness(t);w.localStorage.setItem('bdLastCustomerReceipt',JSON.stringify({repeatItems:[{name:'Carolina Classic Hot Dawg',category:'Hot Dawgs',tops:["Anna's Homemade Slaw"],notes:'Extra napkin',extra:0},{name:'Retired Dawg',tops:[]}]}));
 w.state.setMenu([['Hot Dawgs','Carolina Classic Hot Dawg','',4]]);w.showRepeatOrder();assert.match(w.document.querySelector('#modalBody').textContent,/Unavailable/);assert.match(w.document.querySelector('.total').textContent,/4.27/);w.confirmRepeatOrder();assert.equal(w.state.cart.length,1);assert.equal(w.state.cart[0].notes,'Extra napkin');assert.equal(w.state.cart[0].tops[0],"Anna's Homemade Slaw");assert.equal(w.document.querySelector('#cartTotal').textContent,'4.27');
});
test('combo offer upgrades only one matching dog and keeps its custom toppings',t=>{
 const w=harness(t);w.state.push({i:0,tops:['Yellow Mustard'],notes:'No onions',extra:0});w.state.push({i:0,tops:[],notes:'',extra:0});w.openCart();assert.ok(w.document.querySelector('.comboOffer'));w.upgradeCustomerCombo(0);assert.equal(w.state.menu[w.state.cart[0].i][0],'Hot Dawg Combos');assert.equal(w.state.menu[w.state.cart[1].i][0],'Hot Dawgs');assert.equal(w.state.cart[0].notes,'No onions');
});
test('sold-out combos are never offered for an upgrade',t=>{const w=harness(t);w.state.push({i:0,tops:[]});w.state.setAvailability({'Carolina Classic Hot Dawg Combo':false});assert.equal(w.comboOffer(),'');});
test('rewards renders actual progress and invalid phone numbers do not hit the API',async t=>{
 const w=harness(t);let calls=0;w.bdCustomerRewards=async()=>{calls++;return {progress:3,rewards:1}};w.showRewards();w.document.querySelector('#rewardPhone').value='1';await w.checkCustomerRewards();assert.equal(calls,0);w.document.querySelector('#rewardPhone').value='8285551234';await w.checkCustomerRewards();assert.equal(calls,1);assert.equal(w.document.querySelectorAll('.rewardStamps .earned').length,3);assert.match(w.document.querySelector('#customerRewardsResult').textContent,/1 free hot dog available/);
});
test('progress reflects kitchen state and closing the dialog stops polling',async t=>{
 const w=harness(t);w.localStorage.setItem('bdLastCustomerReceipt',JSON.stringify({id:'12345678-1234-4234-8234-123456789012',phone:'8285551234'}));w.showOrderProgress();await new Promise(resolve=>setImmediate(resolve));assert.equal(w.document.querySelector('[aria-current="step"]').textContent,'Cooking');assert.match(w.document.querySelector('#customerTrackingResult').textContent,/12:30/);w.closeModal();assert.equal(w.state.trackingTimer,null);
});
test('reviews and captions render submitted text without executing markup',async t=>{
 const w=harness(t);w.bdLoadCustomerReviews=async()=>[{id:'x',display_name:'<img src=x onerror=alert(1)>',rating:5,body:'<script>window.attack=true</script>'}];await w.loadCustomerShowcase();assert.equal(w.document.querySelector('#customerReviewList script'),null);assert.equal(w.document.querySelector('#customerReviewList img'),null);assert.match(w.document.querySelector('#customerReviewList').textContent,/<script>/);assert.equal(w.document.querySelector('#realFoodPhotos').hidden,true);
});
test('review submission preserves text on an error and disables duplicate sends on success',async t=>{
 const w=harness(t);w.showCustomerReviewForm();for(const [id,value] of Object.entries({reviewReference:'12345678-1234-4234-8234-123456789012',reviewPhone:'8285551234',reviewName:'Customer A.',reviewRating:'5',reviewBody:'Loved the slaw and chili.'}))w.document.getElementById(id).value=value;
 let count=0;w.bdSubmitCustomerReview=async()=>{count++;throw new Error('offline')};await w.submitCustomerReview();assert.equal(w.document.getElementById('reviewBody').value,'Loved the slaw and chili.');assert.equal(w.document.getElementById('reviewSubmitButton').disabled,false);
 w.bdSubmitCustomerReview=async()=>{count++;return {submitted:true}};await w.submitCustomerReview();assert.equal(count,2);assert.equal(w.document.getElementById('reviewSubmitButton').disabled,true);assert.match(w.document.getElementById('reviewSubmitResult').textContent,/submitted for approval/);
});
