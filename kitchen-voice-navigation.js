/* Baker's Dawgs kitchen voice navigation module.
   Include after admin.js on admin.html to activate.
   Preserves existing speech recognition and readback functions. */
(function () {
  "use strict";
  let selectedId = null;
  function orders() {
    return (window.bdCurrentOrders || []).filter(o => !["Completed","Voided","Cancelled"].includes(o.status));
  }
  function current() {
    const list=orders();
    if (!list.length) return null;
    if (!list.some(o=>String(o.id)===String(selectedId))) selectedId=list[0].id;
    return list.find(o=>String(o.id)===String(selectedId));
  }
  function focusOrder(id) {
    const list=orders();
    const found=list.find(o=>String(o.id)===String(id));
    if (!found) return false;
    selectedId=found.id;
    const index=list.indexOf(found);
    const status=document.getElementById("bdVoiceNavigationStatus");
    if(status) status.textContent="Selected order "+(index+1)+" of "+list.length+": "+(found.customer_name||"Customer");
    document.querySelectorAll("[data-order-id]").forEach(el=>{
      const selected=String(el.dataset.orderId)===String(selectedId);
      el.classList.toggle("bdVoiceSelected",selected);
    });
    return true;
  }
  function speak(text) {
    if(window.BakersDawgsAndroid && typeof window.BakersDawgsAndroid.speak==="function") {
      window.BakersDawgsAndroid.speak(text);return;
    }
    if(!("speechSynthesis" in window))return;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);u.rate=.88;speechSynthesis.speak(u);
  }
  function repeat() {
    const o=current();
    if(!o){speak("There are no active orders.");return;}
    focusOrder(o.id);
    if(typeof window.speakKitchenOrder==="function")window.speakKitchenOrder(o.id);
  }
  function navigate(step) {
    const list=orders();
    if(!list.length){speak("There are no active orders.");return;}
    const o=current(), i=list.findIndex(x=>String(x.id)===String(o.id));
    const next=i+step;
    if(next<0){speak("That's the first order.");return;}
    if(next>=list.length){speak("That's the last order.");return;}
    focusOrder(list[next].id);
    speak("Order "+(next+1)+" of "+list.length+". "+(list[next].customer_name||"Customer")+".");
    repeat();
  }
  const previous=window.handleKitchenCommand;
  window.handleKitchenCommand=function(transcript){
    const said=String(transcript||"").toLowerCase().trim().replace(/[.!?]+$/,"");
    if(/\b(?:next order|go to next order)\b/.test(said)){navigate(1);return;}
    if(/\b(?:previous order|go back an order|last order|back one order)\b/.test(said)){navigate(-1);return;}
    if(/\b(?:repeat that order|repeat the order|read that order)\b/.test(said)){repeat();return;}
    if(typeof previous==="function")return previous(transcript);
  };
  window.bdKitchenVoiceNavigation={focusOrder,repeat,next:()=>navigate(1),previous:()=>navigate(-1)};
  function setup(){
    if(document.getElementById("bdVoiceNavigationStatus"))return;
    const status=document.createElement("div");status.id="bdVoiceNavigationStatus";status.setAttribute("role","status");
    status.style.cssText="padding:12px 16px;margin:12px 0;background:#fff4c2;color:#211700;border:2px solid #c48a00;border-radius:12px;font-weight:800;font-size:18px";
    status.textContent="Voice navigation ready: Repeat that order / Next order / Previous order";
    const anchor=document.getElementById("voiceAssistantStatus");
    if(anchor)anchor.insertAdjacentElement("afterend",status);
    else document.body.prepend(status);
    const style=document.createElement("style");style.textContent=".bdVoiceSelected{outline:4px solid #e7a900!important;outline-offset:3px}";document.head.appendChild(style);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();