const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('admin.js','utf8');
const voice=source.slice(source.indexOf('let kitchenRecognition=null,'),source.indexOf('\n\nasync function changeStatus'));
function setup(t,native=false){
 const dom=new JSDOM('<small id="voiceAssistantStatus"></small>',{runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window,timers=new Map();let seq=0,repeats=0,starts=0,stops=0,recognition;
 w.setTimeout=(fn,delay)=>{timers.set(++seq,{fn,delay});return seq};w.clearTimeout=id=>timers.delete(id);
 w.repeatLastOrder=()=>repeats++;w.speakKitchenOrder=()=>{};
 if(native)w.BakersDawgsAndroid={startListening:()=>starts++,stopListening:()=>stops++};
 else w.SpeechRecognition=class{
  constructor(){recognition=this;this.starts=0;this.aborts=0}
  start(){this.starts++;this.onstart()}
  abort(){this.aborts++;this.onend()}
 };
 w.eval(voice);
 return {w,timers,get recognition(){return recognition},get repeats(){return repeats},get starts(){return starts},get stops(){return stops},
 tick(){const pending=[...timers.values()];timers.clear();for(const {fn} of pending)fn()},
 result(...words){const results=words.map(transcript=>Object.assign([{transcript}],{isFinal:true}));recognition.onresult({results,resultIndex:0})}};
}
test('browser accepts successive commands and restarts after the speech service ends',t=>{
 const h=setup(t);h.w.startKitchenListening();assert.equal(h.recognition.continuous,true);h.result('repeat order');h.recognition.onend();h.tick();h.result('repeat order');assert.equal(h.recognition.starts,2);assert.equal(h.repeats,2);
 h.w.startKitchenListening();assert.equal(h.recognition.starts,2);
});
test('quiet timeouts and temporary network errors keep listening enabled',t=>{
 const h=setup(t);h.w.startKitchenListening();
 for(const error of ['no-speech','network','no-speech']){h.recognition.onerror({error});h.recognition.onend();h.tick()}
 assert.equal(h.recognition.starts,4);h.result('repeat order');assert.equal(h.repeats,1);
});
test('Stop cancels a pending restart and ignores late command results',t=>{
 const h=setup(t);h.w.startKitchenListening();h.recognition.onend();assert.equal(h.timers.size,1);h.w.stopKitchenListening();h.tick();h.result('repeat order');assert.equal(h.recognition.starts,1);assert.equal(h.repeats,0);assert.match(h.w.document.querySelector('small').textContent,/Microphone off/);
});
test('spoken Stop prevents later results in the same event from executing',t=>{
 const h=setup(t);h.w.startKitchenListening();h.result('stop listening','repeat order');h.tick();assert.equal(h.repeats,0);assert.equal(h.recognition.starts,1);
});
test('permission and missing microphone failures do not create retry loops',t=>{
 for(const error of ['not-allowed','service-not-allowed','audio-capture']){
  const h=setup(t);h.w.startKitchenListening();h.recognition.onerror({error});h.recognition.onend();h.tick();assert.equal(h.recognition.starts,1);assert.equal(h.timers.size,0);
 }
});
test('older installed Android apps resume after commands and silence without repeated taps',t=>{
 const h=setup(t,true);h.w.startKitchenListening();h.w.onNativeVoiceStatus('Listening for kitchen commands');h.w.startKitchenListening();assert.equal(h.starts,1);
 h.w.onNativeVoiceCommand('repeat order');h.w.onNativeVoiceStatus('Command received. Tap Start Listening when you need it again.');h.tick();assert.equal(h.starts,2);assert.equal(h.repeats,1);
 h.w.onNativeVoiceStatus('No command heard. Tap Start Listening when you need the kitchen assistant.');h.tick();assert.equal(h.starts,3);
});
test('native Stop cancels legacy restarts and late native events cannot reactivate it',t=>{
 const h=setup(t,true);h.w.startKitchenListening();h.w.onNativeVoiceStatus('Command received. Tap Start Listening when you need it again.');h.w.stopKitchenListening();h.tick();h.w.onNativeVoiceCommand('repeat order');h.w.onNativeVoiceStatus('No command heard. Tap Start Listening when you need the kitchen assistant.');h.tick();assert.equal(h.starts,1);assert.equal(h.repeats,0);assert.equal(h.stops,1);
});
test('timed Pause resumes, while Stop during a Pause cancels the scheduled resume',t=>{
 const h=setup(t);h.w.startKitchenListening();h.w.pauseKitchenListening(10);assert.equal([...h.timers.values()][0].delay,600000);h.tick();assert.equal(h.recognition.starts,2);
 h.w.pauseKitchenListening(30);h.w.stopKitchenListening();h.tick();assert.equal(h.recognition.starts,2);
});
