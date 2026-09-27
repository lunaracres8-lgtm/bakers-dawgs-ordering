const BD_PAYMENT_METHODS=["Cash","Square — Visa","Square — Mastercard","Square — American Express","Square — Discover","Square — Other / Contactless"];

function bdLocalDayKey(d=new Date()){return d.toLocaleDateString("en-CA");}
function bdMoney(v){return "$"+Number(v||0).toFixed(2);}
function bdTodayOrders(){const day=bdLocalDayKey();return (window.bdCurrentOrders||[]).filter(o=>bdLocalDayKey(new Date(o.created_at))===day);}

function bdPaymentSelector(order){
 const current=order.payment_method||"";
 return '<label class="paymentLabel"><b>Payment:</b><select onchange="setOrderPayment(\''+order.id+'\',this.value)"><option value="">Select payment method</option>'+
 BD_PAYMENT_METHODS.map(p=>'<option value="'+p.replace(/"/g,'&quot;')+'" '+(current===p?'selected':'')+'>'+p+'</option>').join("")+
 '</select></label>';
}
async function setOrderPayment(id,method){
 if(method&&!BD_PAYMENT_METHODS.includes(method))return;
 try{await bdUpdateOrder(id,{payment_method:method||null});await loadOrders();}
 catch(e){alert("Could not save payment method.");}
}

function bdDailySummary(orders=bdTodayOrders()){
 const completed=orders.filter(o=>o.status==="Completed");
 const allTotal=orders.reduce((s,o)=>s+Number(o.total||0),0);
 const completedTotal=completed.reduce((s,o)=>s+Number(o.total||0),0);
 const payments=Object.fromEntries(BD_PAYMENT_METHODS.map(p=>[p,{count:0,total:0}]));
 const items={};
 completed.forEach(o=>{
  if(o.payment_method&&payments[o.payment_method]){payments[o.payment_method].count++;payments[o.payment_method].total+=Number(o.total||0);}
  (o.items||[]).forEach(i=>{
   const quantity=Math.max(1,Number(i.quantity)||1);
   const key=[i.name,i.options||"",i.notes||""].join(" | ");
   if(!items[key])items[key]={name:i.name,options:i.options||"",notes:i.notes||"",count:0,total:0};
   items[key].count+=quantity;items[key].total+=Number(i.price||0)*quantity;
  });
 });
 return {day:bdLocalDayKey(),orders,completed,orderCount:orders.length,completedCount:completed.length,allTotal,completedTotal,payments,items:Object.values(items)};
}

function bdCashCountKey(day=bdLocalDayKey()){return "bdCashCount:"+day;}
function bdSavedCashCount(day=bdLocalDayKey()){const value=localStorage.getItem(bdCashCountKey(day));return value===null?null:Number(value);}
function setCashCount(value){
 const s=bdDailySummary(),amount=Math.max(0,Number(value||0));
 localStorage.setItem(bdCashCountKey(s.day),String(amount));renderCloseout();
}

function renderCloseout(){
 const s=bdDailySummary(), box=document.querySelector("#dailyCloseout");
 if(!box)return;
 const cash=s.payments["Cash"].total;
 const square=BD_PAYMENT_METHODS.filter(p=>p.startsWith("Square")).reduce((n,p)=>n+s.payments[p].total,0);
 const counted=bdSavedCashCount(s.day),variance=counted===null?null:Number((counted-cash).toFixed(2));
 box.innerHTML='<div><b>Daily Closeout — '+s.day+'</b><small>'+s.orderCount+' orders • '+s.completedCount+' completed</small></div>'+
 '<div class="closeoutTotals"><span>Completed Sales <b>'+bdMoney(s.completedTotal)+'</b></span><span>Cash <b>'+bdMoney(cash)+'</b></span><span>Square Total <b>'+bdMoney(square)+'</b></span></div>'+
 '<div class="cashCount"><div><b>Cash drawer count</b><small>Expected cash sales: '+bdMoney(cash)+'</small></div><input inputmode="decimal" type="number" min="0" step="0.01" placeholder="Counted cash" value="'+(counted===null?"":counted.toFixed(2))+'" onchange="setCashCount(this.value)">'+(variance===null?'<small>Enter the cash actually in the drawer.</small>':'<strong class="'+(variance===0?"balanced":variance>0?"over":"short")+'">'+(variance===0?"BALANCED":variance>0?"OVER ":"SHORT ")+bdMoney(Math.abs(variance))+'</strong>')+'</div>'+
 '<div class="closeoutButtons"><button onclick="downloadDailyReport()">SAVE DAILY FILE</button><button onclick="printDailyReport()">PRINT / SAVE PDF</button><button onclick="archiveDayLocally()">CLOSE DAY / ARCHIVE</button></div>';
}

function bdReportText(){
 const s=bdDailySummary(), lines=[];
 lines.push("BAKER'S DAWGS — DAILY CLOSEOUT",s.day,"");
 const cash=s.payments["Cash"].total,counted=bdSavedCashCount(s.day);
 lines.push("Orders received: "+s.orderCount,"Completed orders: "+s.completedCount,"Completed sales: "+bdMoney(s.completedTotal),"Expected cash: "+bdMoney(cash),counted===null?"Cash counted: not entered":"Cash counted: "+bdMoney(counted)+" ("+(counted-cash>=0?"over ":"short ")+bdMoney(Math.abs(counted-cash))+")","");
 lines.push("PAYMENTS");
 BD_PAYMENT_METHODS.forEach(p=>lines.push(p+": "+s.payments[p].count+" orders — "+bdMoney(s.payments[p].total)));
 const shifts=typeof shiftsToday==="function"?shiftsToday():[];
 lines.push("","EMPLOYEE SHIFTS");
 shifts.length?shifts.forEach(shift=>{const end=shift.out?new Date(shift.out):new Date();const hours=Math.max(0,(end-new Date(shift.in))/36e5);lines.push(`${shift.name}: ${new Date(shift.in).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}${shift.out?` – ${new Date(shift.out).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:" • still clocked in"} — ${hours.toFixed(2)} hrs`);}):lines.push("No employee shifts entered.");
 lines.push("","ITEMS / OPTIONS");
 s.items.forEach(i=>lines.push(i.count+" × "+i.name+(i.options?" — "+i.options:"")+(i.notes?" — Note: "+i.notes:"")));
 lines.push("","ORDER DETAIL");
 s.orders.forEach((o,n)=>{
  lines.push((n+1)+". "+(o.customer_name||"Customer")+" | "+(o.phone||"")+" | Pickup "+(o.pickup_time||"")+" | "+(o.status||"")+" | "+(o.payment_method||"Payment not selected")+" | "+bdMoney(o.total));
  (o.items||[]).forEach(i=>{const quantity=Math.max(1,Number(i.quantity)||1);lines.push("   - "+quantity+" × "+i.name+(i.options?" — "+i.options:"")+(i.notes?" — "+i.notes:"")+" — "+bdMoney(Number(i.price||0)*quantity));});
  if(o.notes)lines.push("   Order note: "+o.notes);
 });
 lines.push("","Generated: "+new Date().toLocaleString(),"No payment-card numbers or credentials are stored in this report.");
 return lines.join("\n");
}
function downloadDailyReport(){
 const blob=new Blob([bdReportText()],{type:"text/plain;charset=utf-8"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="Bakers_Dawgs_Closeout_"+bdLocalDayKey()+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function printDailyReport(){
 const w=window.open("","_blank");if(!w){alert("Allow pop-ups to print/save the report.");return;}
 w.document.write("<pre style='white-space:pre-wrap;font:14px Arial;padding:24px'>"+bdReportText().replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))+"</pre>");
 w.document.close();w.focus();w.print();
}
async function archiveDayLocally(){
 const s=bdDailySummary();
 if(!confirm("Close and archive "+s.day+"? This does NOT delete the orders."))return;
 if(typeof requireManagerApproval==="function" && !await requireManagerApproval("close today’s books"))return;
 localStorage.setItem("bdCloseout:"+s.day,JSON.stringify({closed_at:new Date().toISOString(),summary:s,report:bdReportText()}));
 alert("Day archived on this tablet. Orders were not deleted. You can also Save Daily File or Print / Save PDF.");
}
