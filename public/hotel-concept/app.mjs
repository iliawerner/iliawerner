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
  if(s.styles){
   if(!Array.isArray(s.styles)||!s.styles.length)throw Error('Styles');
   for(const style of s.styles){
    if(!/^[a-z][a-z0-9-]*$/.test(style.id)||ids.has(style.id)||!style.title||!Array.isArray(style.image_ids)||style.image_ids.length!==4)throw Error('Style');ids.add(style.id);
   }
   if(JSON.stringify(s.styles.flatMap(g=>g.image_ids))!==JSON.stringify(s.images.map(im=>im.id)))throw Error('Style inventory');
  }
 }
 return data;
}
try{
 const response=await fetch('data.json',{cache:'no-cache'});if(!response.ok)throw Error('Network');const data=validate(await response.json());
 document.title=data.title;document.querySelector('h1').textContent=data.title;document.querySelector('#subtitle').textContent=data.subtitle;
 main.replaceChildren();const items=[];
 const figure=(im,group,shortLabel)=>{
  const fig=el('figure'),link=el('a','image-link');link.href=im.original.src;link.id='image-'+im.id;link.dataset.galleryImage=String(items.length);link.setAttribute('aria-label',im.title+' — открыть полный размер');
  const img=el('img');Object.assign(img,{src:im.preview.src,width:im.preview.width,height:im.preview.height,alt:im.alt,decoding:'async',loading:items.length===0?'eager':'lazy'});if(!items.length)img.fetchPriority='high';link.append(img);
  const caption=el('figcaption','image-caption');caption.append(el('strong','image-title',shortLabel||im.title));if(!shortLabel)caption.append(el('span','image-kind',kinds[im.kind]));if(im.note)caption.append(el('p','image-note',im.note));fig.append(link,caption);items.push({...im,group,link});return fig;
 };
 for(const section of data.sections){
  const n=el('a','',section.title);n.href='#'+section.id;nav.append(n);
  const area=el('section','review-section section--'+section.id);area.id=section.id;area.setAttribute('aria-labelledby',section.id+'-title');
  const page=el('div','page'),head=el('div','section-head'),h=el('h2','',section.title);h.id=section.id+'-title';head.append(h);
  if(section.note)head.append(el('p','',section.note));page.append(head);
  if(section.styles){
   const index=el('nav','style-index');index.setAttribute('aria-label','Перейти к варианту фасада');
   for(const style of section.styles){const a=el('a','',style.title);a.href='#'+style.id;index.append(a);}page.append(index);
   const byId=new Map(section.images.map(im=>[im.id,im]));
   for(const style of section.styles){
    const study=el('article','style-study');study.id=style.id;study.setAttribute('aria-labelledby',style.id+'-title');
    const title=el('h3','',style.title);title.id=style.id+'-title';study.append(title);if(style.note)study.append(el('p','style-note',style.note));
    const grid=el('div','style-images');
    const labels=['Главный вид','Окна и фактура','Угол фасада','Фасад и стеклянное основание'];
    style.image_ids.forEach((id,i)=>grid.append(figure(byId.get(id),style.title,labels[i])));study.append(grid);
    const back=el('a','style-back','К списку вариантов ↑');back.href='#materials';study.append(back);page.append(study);
   }
  }else{
   const grid=el('div','section-gallery');for(const im of section.images)grid.append(figure(im,section.title));page.append(grid);
  }
  area.append(page);main.append(area);
 }
 setupViewer(items);document.body.dataset.ready='true';
 const target=document.getElementById(location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant'}));
}catch(error){
 main.replaceChildren(el('p','page empty','Не удалось открыть каталог. Обновите страницу или попробуйте позже.'));document.body.dataset.ready='error';console.error(error);
}
