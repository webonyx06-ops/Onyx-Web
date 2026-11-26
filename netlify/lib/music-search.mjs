const plain=s=>String(s||"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").slice(0,160);
export async function musicSearch({q,id},fetcher=fetch){
 const params=new URLSearchParams({action:"query",format:"json",formatversion:"2",prop:"imageinfo",iiprop:"url|mime|extmetadata"});
 if(id){if(!/^\d{1,12}$/.test(id))return [];params.set("pageids",id);}
 else{if(!q||q.trim().length<2)return [];for(const [k,v] of Object.entries({generator:"search",gsrnamespace:"6",gsrlimit:"20",gsrsearch:q.slice(0,80)+" filetype:audio"}))params.set(k,v);}
 const res=await fetcher("https://commons.wikimedia.org/w/api.php?"+params,{signal:AbortSignal.timeout(6000),headers:{"User-Agent":"ONYXLeagues/4 (https://onyxoficial.netlify.app)"}});if(!res.ok)throw Error("Proveedor musical no disponible.");const data=await res.json();if(data.error)throw Error("Error en la búsqueda musical.");
 return (data.query?.pages||[]).flatMap(p=>{const x=p.imageinfo?.[0],m=x?.extmetadata||{},license=plain(m.LicenseShortName?.value);if(!x||!["CC0","CC0 1.0","Public domain"].includes(license)||!x.mime?.startsWith("audio/")||!x.url?.startsWith("https://upload.wikimedia.org/"))return [];
 return [{id:String(p.pageid),audio:x.url,name:plain(m.ObjectName?.value||p.title.replace(/^File:/,"")),artist:plain(m.Artist?.value),album:plain(m.Album?.value),license,source:"https://commons.wikimedia.org/?curid="+p.pageid}];});
}

// Apple Store metadata with a direct store link. Audio for profiles is supplied by Commons.
export async function storeTracks({q,id},fetcher=fetch){
 const params=new URLSearchParams({country:"AR",entity:"song",limit:"12"});
 if(id){if(!/^apple-\d{1,16}$/.test(id))return [];params.set("id",id.slice(6));}
 else{if(!q||q.trim().length<2)return [];params.set("term",q.trim().slice(0,80));}
 const r=await fetcher("https://itunes.apple.com/"+(id?"lookup":"search")+"?"+params,{signal:AbortSignal.timeout(5500)});
 if(!r.ok)throw Error("Apple Music no respondió.");
 const {results}=await r.json();
 return (results||[]).filter(x=>x.kind==="song"&&Number.isSafeInteger(x.trackId)&&/^https:\/\/(music|itunes)\.apple\.com\//.test(x.trackViewUrl)&&(!id||id==="apple-"+x.trackId)).map(x=>({id:"apple-"+x.trackId,name:plain(x.trackName),artist:plain(x.artistName),album:plain(x.collectionName),duration:Math.round((x.trackTimeMillis||0)/1000),source:x.trackViewUrl,provider:"Apple Music",cover:/^https:\/\/[\w.-]+\.mzstatic\.com\//.test(x.artworkUrl100)?x.artworkUrl100:""}));
}
