// Duration of the first GIF cycle, ignoring loop-count extensions.
export function gifDuration(bytes) {
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(b.length<13||!['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6))))throw Error('“只做一次”需要 GIF 动画；其他图片请选择按时间持续。');
  let i=13+((b[10]&128)?3*(2**((b[10]&7)+1)):0),delay=100,total=0,frames=0;
  const skip=()=>{while(i<b.length){const n=b[i++];if(!n)return;i+=n;if(i>b.length)throw Error('GIF 动画不完整。');}throw Error('GIF 动画不完整。');};
  while(i<b.length){const type=b[i++];if(type===0x3b){if(frames)return total;break;}
    if(type===0x21){const ext=b[i++];if(ext===0xf9){if(b[i++]!==4||i+5>b.length)throw Error('GIF 动画不完整。');const raw=(b[i+1]|b[i+2]<<8)*10;delay=raw<20?100:raw;i+=5;}else skip();}
    else if(type===0x2c){if(i+9>b.length)throw Error('GIF 动画不完整。');const packed=b[i+8];i+=9;if(packed&128)i+=3*(2**((packed&7)+1));i++;skip();total+=delay;delay=100;frames++;}
    else throw Error('无法读取这张 GIF 的动作时长。');
  }
  throw Error('GIF 动画不完整。');
}
export const actionDeadline=(mode,seconds,cycle,now=Date.now())=>mode==='until-cancel'?Infinity:now+(mode==='once'?cycle:Math.max(cycle||0,seconds*1000));
// Fresh URL restarts this animation instead of sharing the already-playing image.
export async function loadCycle(source){
  const response=await fetch(source,{signal:AbortSignal.timeout(10000),credentials:'same-origin'});
  if(!response.ok)throw Error('无法读取动作图片，请稍后重试。');
  const reader=response.body.getReader();const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024)throw Error('动作图片超过 8MB，请选择按时间持续。');chunks.push(value);}}
  catch(error){await reader.cancel();throw error;}
  let blob=new Blob(chunks,{type:'image/gif'});
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(String.fromCharCode(...bytes.slice(0,4))==='<svg'){
    const matches=[...new TextDecoder().decode(bytes).matchAll(/data:image\/gif;base64,([A-Za-z0-9+/=]+)/g)];
    if(matches.length===1){const raw=Uint8Array.from(atob(matches[0][1]),c=>c.charCodeAt(0));blob=new Blob([raw],{type:'image/gif'});}
    else if(matches.length>1){const duration=Math.max(...matches.map(m=>gifDuration(Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0)))));return {url:URL.createObjectURL(new Blob([bytes],{type:'image/svg+xml'})),duration};}
  }
  const duration=gifDuration(await blob.arrayBuffer());
  return {url:URL.createObjectURL(blob),duration};
}
