'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_MODEL, isValidModelId, MODELS, getModelConfig } from '@/lib/models/config';
import { updateSession } from '@/lib/chatHistory';
import type { Message, AiStatus, FileAttachment } from '@/types';
import MessageContent from './MessageContent';

interface Props {
  sessionId: string;
  initialModel?: string;
  initialMessages?: Message[];
  onSessionUpdate?: () => void;
  onMenuToggle?: () => void;
}

const MAX_FILE = 10 * 1024 * 1024;
const EXTS = ['.png','.jpg','.jpeg','.gif','.webp','.svg','.ts','.tsx','.js','.jsx','.py','.java','.c','.cpp','.h','.cs','.go','.rs','.rb','.php','.html','.css','.scss','.sql','.sh','.json','.yaml','.yml','.xml','.toml','.md','.txt','.csv','.log','.zip'];

function ext(n: string) { const i = n.lastIndexOf('.'); return i >= 0 ? n.substring(i).toLowerCase() : ''; }
function isImg(n: string) { return ['.png','.jpg','.jpeg','.gif','.webp'].includes(ext(n)); }
function fmtSz(b: number) { if (b < 1024) return b+'B'; if (b < 1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }
async function rdTxt(f: File): Promise<string> { return new Promise((r,e) => { const fr=new FileReader(); fr.onload=()=>r(fr.result as string); fr.onerror=e; fr.readAsText(f); }); }
async function rdB64(f: File): Promise<string> { return new Promise((r,e) => { const fr=new FileReader(); fr.onload=()=>{const s=fr.result as string; r(s.split(',')[1]||s);}; fr.onerror=e; fr.readAsDataURL(f); }); }
async function procFile(f: File): Promise<FileAttachment> {
  if (isImg(f.name)) return {name:f.name,type:f.type,size:f.size,base64:await rdB64(f),isImage:true};
  if (ext(f.name)==='.zip') return {name:f.name,type:f.type,size:f.size,content:'[ZIP: '+f.name+']',isImage:false};
  return {name:f.name,type:f.type,size:f.size,content:await rdTxt(f),isImage:false};
}

function CopyBtn({text}:{text:string}) {
  const [c,setC]=useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} className="p-1 rounded hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors" title="Copy">
    {c?<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
    :<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
  </button>;
}

export function ChatContainer({ sessionId, initialModel, initialMessages = [], onSessionUpdate, onMenuToggle }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(isValidModelId(initialModel||'')?initialModel!:DEFAULT_MODEL);
  const [cost, setCost] = useState<number|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [inputValue, setInputValue] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDrag, setIsDrag] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController|null>(null);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  // Save to history
  useEffect(()=>{
    if (messages.length > 0) { updateSession(sessionId, messages, selectedModel); onSessionUpdate?.(); }
  }, [messages, sessionId, selectedModel, onSessionUpdate]);

  const handleFiles = useCallback(async(fl:FileList|File[])=>{
    const arr=Array.from(fl); const p:FileAttachment[]=[];
    for(const f of arr){if(f.size>MAX_FILE){setError(f.name+' > 10MB');continue;}if(!EXTS.includes(ext(f.name))){setError(ext(f.name)+' not supported');continue;}try{p.push(await procFile(f));}catch{setError('Failed: '+f.name);}}
    if(p.length>0){setFiles(prev=>[...prev,...p]);setError(null);}
  },[]);

  const buildMsg=useCallback((t:string,fl:FileAttachment[])=>{
    if(!fl.length)return t; let c='';
    for(const f of fl){if(f.isImage)c+='\n\n[Image: '+f.name+']';else if(f.content){c+='\n\n--- '+f.name+' ---\n'+(f.content.length>50000?f.content.substring(0,50000)+'\n...(truncated)':f.content)+'\n--- end ---';}}
    return t+c;
  },[]);

  const handleStop=useCallback(()=>{if(abortRef.current){abortRef.current.abort();abortRef.current=null;setIsLoading(false);}},[]);

  const handleSend=useCallback(async(content:string)=>{
    if((!content.trim()&&!files.length)||isLoading)return;
    setIsLoading(true);setError(null);
    const txt=content.trim()||'Please analyze the attached file(s).';
    const full=buildMsg(txt,files);
    setInputValue('');if(inputRef.current)inputRef.current.style.height='44px';

    const um:Message={id:Date.now().toString(),role:'user',content:txt,timestamp:new Date(),files:files.length>0?[...files]:undefined};
    setMessages(p=>[...p,um]);setFiles([]);

    const abort=new AbortController();abortRef.current=abort;
    try{
      const history=messages.map(m=>({role:m.role,content:m.content}));
      const mc=getModelConfig(selectedModel);
      const hasImgs=um.files?.some(f=>f.isImage);
      const apiBody:Record<string,unknown>={message:full,modelId:selectedModel,history};
      if(hasImgs&&mc.supportsVision&&mc.provider==='Anthropic'){apiBody.images=um.files?.filter(f=>f.isImage&&f.base64).map(f=>({type:f.type||'image/png',data:f.base64}));}

      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(apiBody),signal:abort.signal});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Server error');
      if(!data.message)throw new Error('Empty response.');

      setMessages(p=>[...p,{id:(Date.now()+1).toString(),role:'assistant',content:data.message,timestamp:new Date(),model:data.model||selectedModel,modelName:data.modelName,thinking:data.thinking,cost:data.cost}]);
      setCost(data.cost??null);
    }catch(err:unknown){
      if(err instanceof Error&&err.name==='AbortError'){setMessages(p=>[...p,{id:(Date.now()+1).toString(),role:'assistant',content:'⏹️ Generation stopped.',timestamp:new Date(),modelName:getModelConfig(selectedModel).name}]);}
      else{setError(err instanceof Error?err.message:'Error');}
    }finally{setIsLoading(false);abortRef.current=null;inputRef.current?.focus();}
  },[messages,selectedModel,isLoading,files,buildMsg]);

  const handleEdit=useCallback((id:string)=>{const m=messages.find(x=>x.id===id);if(m&&m.role==='user'){setEditId(id);setEditVal(m.content);}},[messages]);
  const handleEditSubmit=useCallback((id:string)=>{if(!editVal.trim())return;const idx=messages.findIndex(m=>m.id===id);if(idx<0)return;setMessages(messages.slice(0,idx));setEditId(null);setTimeout(()=>handleSend(editVal),50);},[messages,editVal,handleSend]);

  const handleKeyDown=useCallback((e:React.KeyboardEvent<HTMLTextAreaElement>)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(inputValue);}},[inputValue,handleSend]);

  const cur=getModelConfig(selectedModel);
  const allM=Object.values(MODELS);

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent overflow-hidden"
      onDragOver={e=>{e.preventDefault();setIsDrag(true);}} onDragLeave={e=>{e.preventDefault();setIsDrag(false);}}
      onDrop={e=>{e.preventDefault();setIsDrag(false);if(e.dataTransfer.files.length)handleFiles(e.dataTransfer.files);}}>

      {isDrag&&<div className="absolute inset-0 z-50 bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center backdrop-blur-sm"><div className="text-center"><div className="text-4xl mb-2">📎</div><p className="text-orange-600 font-medium">Drop files here</p></div></div>}

      {/* HEADER */}
      <header className="shrink-0 border-b border-black/[0.06] bg-white/60 backdrop-blur-xl safe-top">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onMenuToggle} className="sm:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">B</div>
            <span className="font-semibold text-sm text-gray-800 truncate">BeckRock AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <select value={selectedModel} onChange={e=>{if(isValidModelId(e.target.value))setSelectedModel(e.target.value);}} disabled={isLoading}
              className="max-w-[130px] sm:max-w-none px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs rounded-lg bg-white border border-black/10 text-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 truncate shadow-sm">
              {allM.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3">
          {messages.length===0&&(
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-orange-500/20">AI</div>
              <h2 className="text-gray-700 text-base font-semibold">BeckRock AI</h2>
              <p className="text-gray-400 text-xs max-w-sm">{cur.description}</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {allM.map(m=>(<button key={m.id} onClick={()=>setSelectedModel(m.id)} className={'rounded-full px-2.5 py-1 text-[10px] sm:text-xs border transition-all '+(m.id===selectedModel?'bg-orange-50 border-orange-200 text-orange-600':'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>{m.name}</button>))}
              </div>
            </div>
          )}

          {messages.map(msg=>(
            <div key={msg.id} className={'flex '+(msg.role==='user'?'justify-end':'justify-start')}>
              <div className={'max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 group relative shadow-sm '+(msg.role==='user'?'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-500/10':'bg-white border border-black/[0.06] text-gray-800 shadow-black/[0.03]')}>
                {msg.files&&msg.files.length>0&&(<div className="flex flex-wrap gap-1.5 mb-2">{msg.files.map((f,i)=>(<span key={i} className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] '+(msg.role==='user'?'bg-white/20 text-white/90':'bg-gray-100 text-gray-500')}>{f.isImage?'🖼️':'📄'} {f.name}</span>))}</div>)}
                {msg.thinking&&(<details className="mb-2"><summary className="text-[10px] sm:text-xs text-purple-500 cursor-pointer">💭 Thinking</summary><div className="mt-2 text-[10px] text-gray-500 bg-purple-50 rounded-lg p-2 border border-purple-100 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{msg.thinking}</div></details>)}

                {editId===msg.id?(
                  <div className="space-y-2">
                    <textarea value={editVal} onChange={e=>setEditVal(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg bg-white/20 border border-white/30 text-white resize-none focus:outline-none" rows={3} autoFocus/>
                    <div className="flex gap-2">
                      <button onClick={()=>handleEditSubmit(msg.id)} className="px-3 py-1 text-xs rounded-lg bg-white text-orange-600 font-medium">Resend</button>
                      <button onClick={()=>{setEditId(null);setEditVal('');}} className="px-3 py-1 text-xs rounded-lg bg-white/20 text-white">Cancel</button>
                    </div>
                  </div>
                ):(
                  msg.role==='assistant'?<MessageContent content={msg.content}/>:
                  <div className="text-[13px] sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className={'flex items-center gap-1.5 text-[9px] sm:text-[10px] '+(msg.role==='user'?'text-white/50':'text-gray-400')}>
                    <span>{msg.timestamp.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span>
                    {msg.modelName&&<span>• {msg.modelName}</span>}
                    {msg.cost!=null&&<span className="text-green-500">• ${msg.cost.toFixed(4)}</span>}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.role==='assistant'&&<CopyBtn text={msg.content}/>}
                    {msg.role==='user'&&editId!==msg.id&&(
                      <button onClick={()=>handleEdit(msg.id)} className={'p-1 rounded hover:bg-white/20 transition-colors '+(msg.role==='user'?'text-white/50 hover:text-white':'text-gray-400 hover:text-gray-600')} title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading&&(
            <div className="flex justify-start">
              <div className="bg-white border border-black/[0.06] rounded-2xl px-3.5 py-2.5 flex items-center gap-3 shadow-sm">
                <div className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay:'0ms'}}/><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay:'300ms'}}/></div>
                <span className="text-xs text-gray-500">{cur.name}...</span>
                <button onClick={handleStop} className="ml-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-500 text-[10px] sm:text-xs hover:bg-red-100 transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>Stop
                </button>
              </div>
            </div>
          )}

          {error&&<div className="flex justify-center"><div className="w-full max-w-md px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm">❌ {error}</div></div>}
          <div ref={endRef}/>
        </div>
      </div>

      {cost!==null&&<div className="shrink-0 px-4 py-1 bg-green-50/50 border-t border-green-200/30"><p className="text-[10px] text-green-600/60 text-center">Cost: ${cost.toFixed(6)}</p></div>}

      {files.length>0&&(
        <div className="shrink-0 px-3 py-2 border-t border-black/5 bg-white/50">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5">
            {files.map((f,i)=>(
              <div key={i} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-orange-50 border border-orange-200/50 text-xs text-orange-700">
                {f.isImage?'🖼️':'📄'}<span className="truncate max-w-[120px] sm:max-w-[200px]">{f.name}</span><span className="text-orange-400 text-[10px]">({fmtSz(f.size)})</span>
                <button onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-orange-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="shrink-0 border-t border-black/[0.06] bg-white/60 backdrop-blur-xl safe-bottom">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex gap-2 items-end">
            <button onClick={()=>fileRef.current?.click()} disabled={isLoading} className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white border border-black/10 text-gray-400 hover:text-orange-500 hover:border-orange-200 disabled:opacity-30 transition-all shadow-sm" title="Attach">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" accept={EXTS.join(',')} onChange={e=>{if(e.target.files)handleFiles(e.target.files);e.target.value='';}}/>
            <div className="flex-1">
              <textarea ref={inputRef} value={inputValue}
                onChange={e=>{setInputValue(e.target.value);const el=e.target;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,160)+'px';}}
                onKeyDown={handleKeyDown} disabled={isLoading}
                placeholder={'Message '+cur.name+'...'}
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 text-[13px] sm:text-sm rounded-xl bg-white border border-black/10 text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300 disabled:opacity-50 transition-all leading-relaxed shadow-sm"
                style={{minHeight:'40px',maxHeight:'160px'}}/>
            </div>
            <button onClick={()=>handleSend(inputValue)} disabled={isLoading||(!inputValue.trim()&&!files.length)}
              className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/30 active:scale-95">
              {isLoading?<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              :<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;