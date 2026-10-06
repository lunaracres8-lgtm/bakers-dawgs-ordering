const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {webcrypto}=require('node:crypto');
function harness(){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://bakersdawgs.com/admin.html',runScripts:'outside-only'});
 const w=dom.window,orders=[],dialogs=[],requests=[];
 Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.AbortController=AbortController;
 w.alert=x=>dialogs.push(x);w.confirm=()=>true;w.prompt=()=>null;
 w.fetch=async(url,options={})=>{
  const method=options.method||'GET';requests.push({url,method,body:options.body});
  let value=[];const u=new URL(url,'https://bakersdawgs.com');
  if(u.pathname.includes('/orders')){
   const id=u.searchParams.get('id')?.slice(3);
   if(method==='POST') {const row=JSON.parse(options.body);if(orders.some(o=>o.id===row.id))return new Response('{}',{status:409});orders.push({...row,created_at:new Date().toISOString()});return new Response(null,{status:201});}
   if(method==='PATCH'){const row=orders.find(o=>o.id===id);if(row)Object.assign(row,JSON.parse(options.body));value=row?[row]:[];}
   else if(method==='DELETE'){const i=orders.findIndex(o=>o.id===id);if(i>=0)orders.splice(i,1);return new Response(null,{status:204});}
   else value=id?orders.filter(o=>o.id===id):orders;
  }else if(u.pathname.includes('/auth/v1/user'))value={id:'e915fbd7-f087-471a-8a22-1c544ab6a263'};
  else if(u.pathname.includes('restaurant_settings'))value=[{id:1,ordering_open:true,prep_minutes:20}];
  return new Response(JSON.stringify(value),{status:200});
 };
 w.eval(['config.js','db.js','daily-closeout.js','admin.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n')+`\nwindow.auditState={get cart(){return windowSaleCart},get draft(){return windowSaleDraft},get saving(){return windowSaleSaving},setMenu(items){editableMenuItems=items},setDiscount(v){windowSaleDiscount=v},approve(){managerApprovalUntil=Date.now()+60000},unlock(){showBoard()}};`);
 w.localStorage.setItem('bdAccessToken','test-access');w.setupAdminViews();w.setAdminView('window');
 w.auditState.setMenu([{id:'dog',item_name:'Hot Dawg',price:3.28,category:'Hot Dogs',available:true},{id:'sold',item_name:'Sold Out',price:4,available:false}]);w.renderWindowOrder();
 return {dom,w,orders,dialogs,requests};
}
function cleanup(t,h){t.after(()=>h.dom.window.close());}
test('cash sale saves once, shows confirmation and resets customer/payment',async t=>{
 const h=harness();cleanup(t,h);const {w,orders}=h;w.addWindowSaleItem('dog');w.document.querySelector('#windowCustomerName').value='Anna';w.document.querySelector('#windowCustomerPhone').value='8285551234';w.document.querySelector('#windowPayment').value='Cash';
 await Promise.all([w.submitWindowSale(true),w.submitWindowSale(true)]);
 assert.equal(orders.length,1);assert.equal(orders[0].total,3.50);assert.equal(orders[0].status,'Completed');assert.equal(w.auditState.cart.length,0);
 assert.match(w.document.querySelector('.windowSaleConfirmation').textContent,/Sale completed/);assert.equal(w.document.querySelector('#windowCustomerName').value,'');assert.equal(w.document.querySelector('#windowPayment').value,'');assert.equal(w.bdDailySummary().completedCount,1);
});
test('missing payment blocks completion; clear cancellation keeps items',async t=>{
 const h=harness();cleanup(t,h);const {w,orders}=h;w.addWindowSaleItem('dog');await w.submitWindowSale(true);assert.equal(orders.length,0);assert.equal(w.auditState.cart.length,1);
 w.confirm=()=>false;w.clearWindowSale();assert.equal(w.auditState.cart.length,1);w.confirm=()=>true;w.clearWindowSale();assert.equal(w.auditState.cart.length,0);
});
test('failed save keeps the order; retry reuses its UUID',async t=>{
 const h=harness();cleanup(t,h);const {w}=h;w.addWindowSaleItem('dog');w.document.querySelector('#windowPayment').value='Cash';const ids=[];let fail=true;
 w.bdCreateStaffOrder=async order=>{ids.push(order.id);if(fail)throw new Error('offline');};
 await w.submitWindowSale(true);assert.equal(w.auditState.cart.length,1);assert.equal(w.document.querySelector('#windowPayment').value,'Cash');assert.equal(w.auditState.saving,false);
 fail=false;await w.submitWindowSale(true);assert.equal(ids[0],ids[1]);assert.equal(w.auditState.cart.length,0);
});
test('lost insert response reconciles the existing sale, including JSONB key order',async t=>{
 const h=harness();cleanup(t,h);const {w,orders}=h;const base=w.fetch;let lose=true;
 w.fetch=async(url,opts={})=>{const result=await base(url,opts);if(opts.method==='POST'&&String(url).includes('/orders')&&lose){lose=false;orders[0].items=orders[0].items.map(i=>({notes:i.notes,quantity:i.quantity,price:i.price,name:i.name,options:i.options}));throw new TypeError('Network response lost');}return result;};
 w.addWindowSaleItem('dog');w.document.querySelector('#windowPayment').value='Cash';await w.submitWindowSale(true);assert.equal(orders.length,1);assert.equal(w.auditState.cart.length,0);
});
test('kitchen ticket progresses through ready and completed; voided is not open',async t=>{
 const h=harness();cleanup(t,h);const {w,orders}=h;w.addWindowSaleItem('dog');await w.submitWindowSale(false);assert.equal(orders[0].status,'New');
 const id=orders[0].id;for(const status of ['Accepted','Cooking','Ready'])await w.changeStatus(id,status);assert.equal(w.nextStatus('Ready'),'Completed');
 await w.changeStatus(id,'Completed');assert.equal(orders[0].status,'Ready');await w.setOrderPayment(id,'Cash');await w.changeStatus(id,'Completed');assert.equal(orders[0].status,'Completed');
 await w.changeStatus(id,'New');w.auditState.approve();w.prompt=()=> 'Duplicate ticket';await w.voidOrder(id);assert.equal(orders[0].status,'Voided');assert.equal(w.document.querySelector('#openCount').textContent,'0');assert.equal(w.bdDailySummary().completedCount,0);
});
test('delete requires approval and verifies removal',async t=>{
 const h=harness();cleanup(t,h);const {w,orders}=h;w.addWindowSaleItem('dog');await w.submitWindowSale(false);const id=orders[0].id;
 await w.deleteOrder(id);assert.equal(orders.length,1);w.auditState.approve();await w.deleteOrder(id);assert.equal(orders.length,0);assert.ok(h.dialogs.includes('Order deleted.'));
});
test('discount, quantities, sold-out item and loyalty controls',async t=>{
 const h=harness();cleanup(t,h);const {w}=h;w.addWindowSaleItem('sold');assert.equal(w.auditState.cart.length,0);w.addWindowSaleItem('dog');w.changeWindowSaleQuantity(0,1);assert.equal(w.auditState.cart[0].quantity,2);
 w.auditState.approve();const answers=['1.00','Manager comp'];w.prompt=()=>answers.shift();await w.applyWindowDiscount();assert.equal(w.windowSubtotal(),5.56);w.document.querySelector('#windowPayment').value='Cash';await w.submitWindowSale(true);assert.equal(h.orders[0].total,5.94);
 w.checkWindowLoyalty();w.document.querySelector('#loyaltyPhone').value='8285551234';w.document.querySelector('#checkLoyaltyButton').click();assert.match(w.document.querySelector('#loyaltyResultBox').textContent,/0 completed visits/);
});
test('native exports and receipts use Android save and print',t=>{
 const h=harness();cleanup(t,h);const calls=[];h.w.BakersDawgsAndroid={saveText:(...args)=>calls.push(['save',...args]),printText:(...args)=>calls.push(['print',...args])};h.w.downloadDailyReport();h.w.printDailyReport();h.w.downloadSystemBackup();assert.deepEqual(calls.map(x=>x[0]),['save','print','save']);assert.match(calls[0][1],/Closeout_.*\.txt/);
});
test('repeat ticket replaces old customer details; password requirements enforced',t=>{
 const h=harness();cleanup(t,h);const {w}=h;w.document.querySelector('#windowCustomerName').value='Old customer';w.bdCurrentOrders=[{id:'1234',customer_name:'New customer',phone:'8285551234',items:[{name:'Hot Dawg',price:3.28,quantity:1}]}];w.repeatOrderAtWindow('1234');assert.equal(w.document.querySelector('#windowCustomerName').value,'New customer');assert.equal(w.strongPassword('short'),false);assert.equal(w.strongPassword('LongPassword123!'),true);
});
