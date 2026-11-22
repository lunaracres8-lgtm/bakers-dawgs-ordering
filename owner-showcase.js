// Owner-only photo publishing and genuine customer review moderation.
let ownerShowcasePhotos=[],ownerShowcaseBusy=false;
function showcaseText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setupOwnerShowcase(){
 const app=document.getElementById('app');if(!app||document.getElementById('ownerShowcase'))return;
 const panel=document.createElement('section');panel.id='ownerShowcase';panel.dataset.adminView='owner';panel.className='ownerShowcase';
 panel.innerHTML=`<details><summary>Food photos & customer reviews</summary><div class="ownerShowcaseBody"><h2>Your real food photos</h2><p>Upload up to six photos from your phone or tablet. Add a caption, then publish. Use your own food photos or photos you have permission to publish.</p><input type="file" id="showcaseUpload" accept="image/jpeg,image/png,image/webp" multiple><button type="button" onclick="loadOwnerShowcase()">LOAD / RELOAD PHOTOS</button><div id="ownerPhotoList"></div><button type="button" id="saveShowcaseButton" onclick="saveOwnerShowcase()">PUBLISH PHOTO CHANGES</button><p id="ownerPhotoStatus" role="status"></p><h2>Customer review approvals</h2><p>Only reviews tied to completed orders can be submitted. Approve a review to display its name, rating, and text on the customer site.</p><button type="button" onclick="loadOwnerReviews()">LOAD / REFRESH REVIEWS</button><div id="ownerReviewList" aria-live="polite"></div></div></details>`;
 app.append(panel);document.getElementById('showcaseUpload').addEventListener('change',uploadShowcasePhotos);
 panel.querySelector('details').addEventListener('toggle',event=>{if(event.target.open&&!panel.dataset.loaded){panel.dataset.loaded='true';loadOwnerShowcase();loadOwnerReviews();}});
}
function drawOwnerPhotos(){
 document.getElementById('ownerPhotoList').innerHTML=ownerShowcasePhotos.map((p,i)=>`<article class="ownerFoodPhoto"><img src="${/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.src)?p.src:''}" alt="Uploaded food preview"><div><label>Photo caption<input maxlength="100" value="${showcaseText(p.caption||'')}" oninput="ownerShowcasePhotos[${i}].caption=this.value"></label><label><input type="radio" name="featuredFoodPhoto" ${p.featured?'checked':''} onchange="featureOwnerPhoto(${i})"> Use as the Carolina Classic feature photo</label><button type="button" onclick="removeOwnerPhoto(${i})">REMOVE FROM GALLERY</button></div></article>`).join('')||'<p>No real food photos published yet. Choose photos above to add them.</p>';
}
function featureOwnerPhoto(index){ownerShowcasePhotos.forEach((p,i)=>p.featured=i===index);drawOwnerPhotos();}
function removeOwnerPhoto(index){ownerShowcasePhotos.splice(index,1);drawOwnerPhotos();}
async function loadOwnerShowcase(){
 if(ownerShowcaseBusy)return;ownerShowcaseBusy=true;const status=document.getElementById('ownerPhotoStatus');status.textContent='Loading photos…';
 try{ownerShowcasePhotos=await bdLoadShowcase();drawOwnerPhotos();status.textContent='Photos loaded. Changes appear publicly after you publish.';}catch{status.textContent='Could not load photos. Try again.';}finally{ownerShowcaseBusy=false;}
}
async function compressFoodPhoto(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000)throw new Error('Choose JPG, PNG or WebP photos smaller than 20 MB.');
 const url=URL.createObjectURL(file);
 try{const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('That photo could not be opened.'));i.src=url;});
  const scale=Math.min(1,1000/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  let src=canvas.toDataURL('image/jpeg',.76);if(src.length>280000)src=canvas.toDataURL('image/jpeg',.5);if(src.length>280000)throw new Error('That photo is too detailed. Crop it and try again.');return src;
 }finally{URL.revokeObjectURL(url);}
}
async function uploadShowcasePhotos(event){
 const files=[...event.target.files];if(!files.length)return;
 const status=document.getElementById('ownerPhotoStatus');
 if(ownerShowcaseBusy){status.textContent='Wait for the current photo operation to finish.';return;}
 if(ownerShowcasePhotos.length+files.length>6){status.textContent='Choose no more than six photos total.';event.target.value='';return;}
 ownerShowcaseBusy=true;document.getElementById('saveShowcaseButton').disabled=true;status.textContent='Preparing your photos…';
 try{const prepared=[];for(const file of files)prepared.push({src:await compressFoodPhoto(file),caption:'',featured:false});ownerShowcasePhotos.push(...prepared);drawOwnerPhotos();status.textContent='Photos ready. Add captions and publish your changes.';}catch(error){status.textContent=error.message;}finally{ownerShowcaseBusy=false;document.getElementById('saveShowcaseButton').disabled=false;event.target.value='';}
}
async function saveOwnerShowcase(){
 if(ownerShowcaseBusy)return;ownerShowcaseBusy=true;const button=document.getElementById('saveShowcaseButton'),status=document.getElementById('ownerPhotoStatus');button.disabled=true;
 try{await bdSaveShowcase(ownerShowcasePhotos);status.textContent='Published — your photos are now available on the customer site.';}catch{status.textContent='Could not publish. Sign in as the owner and try again. Your changes are still here.';}finally{ownerShowcaseBusy=false;button.disabled=false;}
}
async function loadOwnerReviews(){
 const target=document.getElementById('ownerReviewList');target.textContent='Loading reviews…';
 try{const reviews=await bdLoadCustomerReviews(true);target.innerHTML=reviews.map(r=>`<article class="ownerReview"><b>${showcaseText(r.display_name)} · ${Number(r.rating)} / 5</b><p>${showcaseText(r.body)}</p><small>${r.approved?'PUBLISHED':'AWAITING APPROVAL'}</small><button type="button" data-review-id="${showcaseText(r.id)}" data-approved="${!r.approved}">${r.approved?'UNPUBLISH':'APPROVE & PUBLISH'}</button></article>`).join('')||'<p>No customer reviews have been submitted yet.</p>';target.querySelectorAll('[data-review-id]').forEach(button=>button.onclick=()=>moderateOwnerReview(button));}
 catch{target.textContent='Could not load reviews. Sign in as the owner and try again.';}
}
async function moderateOwnerReview(button){button.disabled=true;try{await bdModerateReview(button.dataset.reviewId,button.dataset.approved==='true');await loadOwnerReviews();}catch{alert('Could not update the review. Please sign in as the owner and try again.');button.disabled=false;}}
setupOwnerShowcase();
