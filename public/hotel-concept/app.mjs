import {setupViewer} from './viewer.mjs';
const main=document.querySelector('#gallery'),nav=document.querySelector('#sections-nav');
const kinds={concept:'GPT Image · по мастер-модели',material:'Вариант материала',atmosphere:'Интерьерный образ',native:'Нативный рендер Blender'};
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
export function validate(data){
 if(data.version!==1||!Array.isArray(data.sections)||!data.sections.length)throw Error('Catalog');
 const ids=new Set();
 for(const s of data.sections){
  if(!/^[a-z][a-z0-9-]*$/.test(s.id)||ids.has(s.id)||!s.title||!Array.isArray(s.images)||!s.images.length)throw Error('Section');ids.add(s.id);
  for(const im of s.images){
   if(!/^[a-z][a-z0-9-]*$/.test(im.id)||ids.has(im.id)||!im.title||!im.alt||!kinds[im.kind])throw Error('Image');ids.add(im.id);
   for(const [type,re] of [['original',/^images\/[a-z0-9-]+\.png$/],['preview',/^previews\/[a-z0-9-]+\.webp$/]]){
    const a=im[type];if(!a||!re.test(a.src)||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1)throw Error('Asset');
   }
  }
 }
 return data;
}
try{
 const response=await fetch('data.json',{cache:'no-cache'});if(!response.ok)throw Error('Network');const data=validate(await response.json());
 document.title=data.title;document.querySelector('h1').textContent=data.title;document.querySelector('#subtitle').textContent=data.subtitle;
 main.replaceChildren();const items=[];
 for(const section of data.sections){
  const n=el('a','',section.title);n.href='#'+section.id;nav.append(n);
  const area=el('section','review-section section--'+section.id);area.id=section.id;area.setAttribute('aria-labelledby',section.id+'-title');
  const page=el('div','page'),head=el('div','section-head'),h=el('h2','',section.title);h.id=section.id+'-title';head.append(h);
  if(section.note)head.append(el('p','',section.note));page.append(head);const grid=el('div','section-gallery');
  for(const im of section.images){
   const fig=el('figure'),link=el('a','image-link');link.href=im.original.src;link.id='image-'+im.id;link.dataset.galleryImage=String(items.length);link.setAttribute('aria-label',im.title+' — открыть полный размер');
   const img=el('img');Object.assign(img,{src:im.preview.src,width:im.preview.width,height:im.preview.height,alt:im.alt,decoding:'async',loading:items.length===0?'eager':'lazy'});if(!items.length)img.fetchPriority='high';link.append(img);
   const caption=el('figcaption','image-caption');caption.append(el('strong','image-title',im.title),el('span','image-kind',kinds[im.kind]));if(im.note)caption.append(el('p','image-note',im.note));fig.append(link,caption);grid.append(fig);items.push({...im,group:section.title,link});
  }
  page.append(grid);area.append(page);main.append(area);
 }
 setupViewer(items);document.body.dataset.ready='true';
 const target=document.getElementById(location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant'}));
}catch(error){
 main.replaceChildren(el('p','page empty','Не удалось открыть каталог. Обновите страницу или попробуйте позже.'));document.body.dataset.ready='error';console.error(error);
}
