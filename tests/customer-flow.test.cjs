const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function harness(t){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://bakersdawgs.com/',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window;w.alert=()=>{};w.bdGetBusinessBranding=async()=>null;w.bdGetRestaurantSettings=async()=>({ordering_open:true,prep_minutes:20});w.bdGetMenuAvailability=async()=>[];w.bdGetMenuItems=async()=>[];w.bdNewUuid=()=> '12345678-1234-4234-8234-123456789012';w.bdCreateOrder=async o=>({id:o.id});
 w.eval(fs.readFileSync('app.js','utf8')+'\nwindow.customerState={get menu(){return menu},get cart(){return cart},setMenu(v){menu=v;cats=[...new Set(menu.map(x=>x[0]))]},setCart(v){cart=v}}');
 return w;
}
test('each hot dog style selects its included toppings and supports removing slaw',t=>{
 const w=harness(t);
 for(const [name,toppings] of [['Carolina Classic Hot Dawg',["Yellow Mustard","Chili","Fresh Onions","Anna\'s Homemade Slaw"]],['Sauerkraut & Mustard Dawg',['Sauerkraut','Yellow Mustard']],['Chili & Cheez Dawg',['Chili','Cheese']],['Chili, Onion & Mustard Dawg',['Chili','Fresh Onions','Yellow Mustard']],['Sweet Relish & Mustard Dawg',['Sweet Relish','Yellow Mustard']]]){
  w.customize(w.customerState.menu.findIndex(x=>x[1]===name));assert.deepEqual([...w.document.querySelectorAll('.checks input:checked')].map(x=>x.value).sort(),toppings.sort());
 }
 w.customize(0);[...w.document.querySelectorAll('.checks input')].find(x=>/Slaw/.test(x.value)).checked=false;w.addCustomized();assert.equal(w.customerState.cart[0].tops.some(x=>/Slaw/.test(x)),false);
});
test('cloud combo-only menu retains standalone choices, Carolina ingredients and canned pricing',async t=>{
 const w=harness(t);await new Promise(resolve=>setImmediate(resolve));
 w.bdGetMenuItems=async()=>[{category:'Hot Dawg Combos',item_name:'Carolina Classic Hot Dawg Combo',price:6.56},{category:'Drinks & Sides',item_name:'Bottled Drink / Soda',price:2}];
 await w.loadEditableMenu();const menu=w.customerState.menu;assert.equal(menu[0][1],'Carolina Classic Hot Dawg');assert.match(menu[0][2],/Slaw/);assert.equal(menu.some(x=>/Bottled Drink/.test(x[1])),false);assert.equal(menu.find(x=>x[1]==='Bottled Water')?.[3],1);assert.ok(menu.filter(x=>/12 oz can/.test(x[1])).every(x=>x[3]===1.5));
});
test('rapid checkout taps create one ticket and keep toppings in the submitted receipt',async t=>{
 const w=harness(t);w.orderCarolinaClassic();w.addClassicQuickOrder();w.document.querySelector('#name').value='Test Customer';w.document.querySelector('#phone').value='8285551234';w.document.querySelector('#time').selectedIndex=1;w.document.querySelector('#humanCheck').checked=true;
 let calls=0,submitted;w.bdCreateOrder=async order=>{calls++;submitted=order;return {id:'12345678-1234-4234-8234-123456780099'}};
 await Promise.all([w.placeOrder(),w.placeOrder()]);assert.equal(calls,1);assert.match(submitted.items[0].options,/Slaw/);assert.match(w.document.querySelector('.orderNumber').textContent,/#0099/);assert.equal(w.customerState.cart.length,0);
});
test('background menu refresh does not change the identity of a cart item',async t=>{
 const w=harness(t);w.customerState.setCart([{i:0,tops:[],extra:0}]);let called=false;w.bdGetMenuItems=async()=>{called=true;return []};await w.loadEditableMenu();assert.equal(called,false);assert.equal(w.customerState.menu[w.customerState.cart[0].i][1],'Carolina Classic Hot Dawg');
});
test('category selection survives background refresh and checkout rejects fractional quantities',async t=>{
 const w=harness(t);w.document.querySelector('#menu').scrollIntoView=()=>{};
 w.showCat('Drinks & Sides');await w.refreshMenuAvailability();
 assert.deepEqual([...w.document.querySelectorAll('.category h2')].map(x=>x.textContent),['Drinks & Sides']);
 assert.equal(w.document.querySelector('[data-category="Drinks & Sides"]').getAttribute('aria-pressed'),'true');
 w.customize(0);w.document.querySelector('#qty').value='1.5';w.addCustomized();assert.equal(w.customerState.cart.length,0);
});
