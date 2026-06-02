'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const G = {
  bg:'#0A0A0F', surface:'#12121A', card:'#1A1A26', border:'#2A2A3E',
  accent:'#6C63FF', accentHot:'#FF6584', accentGreen:'#43E97B',
  accentCyan:'#38F9D7', text:'#F0F0FF', muted:'#7A7A9D', gold:'#FFD166',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{
    height:100%; height:100dvh;
    overflow:hidden;
    background:${G.bg};
    /* Prevent iOS rubber-band scroll */
    overscroll-behavior:none;
  }
  body{
    height:100%; height:100dvh;
    overflow:hidden;
    color:${G.text};
    font-family:'DM Sans',sans-serif;
    overscroll-behavior:none;
    -webkit-tap-highlight-color:transparent;
    -webkit-text-size-adjust:100%;
    background:${G.bg};
  }
  #__next{
    height:100%; height:100dvh;
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }
  /* Safe area for notch/home-bar on iPhone & Android */
  .app-root{
    position:fixed;
    top:0; left:0; right:0; bottom:0;
    /* Respect notch top and home-indicator bottom */
    padding-top:env(safe-area-inset-top);
    padding-bottom:env(safe-area-inset-bottom);
    padding-left:env(safe-area-inset-left);
    padding-right:env(safe-area-inset-right);
    display:flex;
    flex-direction:column;
    background:${G.bg};
    overflow:hidden;
  }
  /* Scrollable content zone - fills remaining space between header and nav */
  .app-scroll{
    flex:1 1 0%;
    min-height:0;
    overflow-y:auto;
    overflow-x:hidden;
    -webkit-overflow-scrolling:touch;
    overscroll-behavior:contain;
  }
  /* Nav always visible at bottom */
  .app-nav{
    flex:0 0 auto;
  }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${G.accent}55;border-radius:4px}
  .syne{font-family:'Syne',sans-serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp .28s ease forwards}
  .hov{transition:transform .14s,box-shadow .14s;cursor:pointer}
  .hov:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(108,99,255,.22)}
  input,textarea,select{font-family:'DM Sans',sans-serif;}
`

// ─── UTILS ───────────────────────────────────────────────────────────────────
const ini = n => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
const avColor = n => {
  const c=[G.accent,G.accentHot,G.accentGreen,G.accentCyan,G.gold,'#A78BFA','#FB923C','#34D399']
  let h=0; for(let x of n) h=(h*31+x.charCodeAt(0))&0xffff
  return c[h%c.length]
}
const toEmbed = url => {
  if(!url) return null
  const m=url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if(m) return `https://drive.google.com/file/d/${m[1]}/preview`
  const m2=url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if(m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return url
}
const ts = () => new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
const fileIcon = t => t?.includes('pdf')?'📄':t?.includes('image')?'🖼️':t?.includes('word')||t?.includes('document')?'📝':t?.includes('sheet')||t?.includes('excel')?'📊':'📎'
// Supabase JSONB can come back as a string — always parse safely
const parseAtts = (atts) => {
  if(!atts) return []
  if(typeof atts==='string'){ try{ return JSON.parse(atts) }catch{ return [] } }
  return Array.isArray(atts)?atts:[]
}
const fmtSize = b => b>1048576?`${(b/1048576).toFixed(1)} Mo`:`${Math.round(b/1024)} Ko`
const CLASS_COLORS = [G.accent,G.accentHot,G.accentGreen,G.accentCyan,G.gold,'#A78BFA','#FB923C','#34D399']


// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
const Bdg = ({children,color=G.accent,sm}) => (
  <span style={{background:color+'22',color,border:`1px solid ${color}44`,borderRadius:6,padding:sm?'1px 6px':'2px 8px',fontSize:sm?10:11,fontWeight:600,whiteSpace:'nowrap'}}>{children}</span>
)
const Av = ({name,size=36}) => {
  const c=avColor(name)
  return <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${c},${c}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,fontWeight:700,fontFamily:'Syne',flexShrink:0}}>{ini(name)}</div>
}
const PBar = ({value,color=G.accent,h=6}) => (
  <div style={{height:h,background:G.border,borderRadius:3,overflow:'hidden',width:'100%'}}>
    <div style={{height:'100%',width:`${Math.min(100,value||0)}%`,background:`linear-gradient(90deg,${color},${color}99)`,borderRadius:3,transition:'width .5s ease'}}/>
  </div>
)
const Btn = ({onClick,children,v='primary',sm,full,style:s,disabled,loading}) => {
  const base={border:'none',borderRadius:10,cursor:disabled||loading?'not-allowed':'pointer',fontFamily:'DM Sans',fontWeight:500,transition:'all .16s',display:'inline-flex',alignItems:'center',gap:6,opacity:disabled?.5:1,...s}
  const sz=sm?{padding:'6px 13px',fontSize:13}:{padding:'10px 20px',fontSize:14}
  const vv={
    primary:{background:`linear-gradient(135deg,${G.accent},#8B7FFF)`,color:'#fff',boxShadow:`0 4px 16px ${G.accent}44`},
    hot:    {background:`linear-gradient(135deg,${G.accentHot},#FF8FA3)`,color:'#fff'},
    green:  {background:`linear-gradient(135deg,${G.accentGreen},#38E8A0)`,color:'#0A0A0F'},
    cyan:   {background:`linear-gradient(135deg,${G.accentCyan},#38D7C0)`,color:'#0A0A0F'},
    ghost:  {background:G.border+'88',color:G.text,border:`1px solid ${G.border}`},
    danger: {background:'linear-gradient(135deg,#FF4444,#FF6666)',color:'#fff'},
  }
  return (
    <button onClick={disabled||loading?undefined:onClick} style={{...base,...sz,...vv[v],width:full?'100%':undefined,justifyContent:full?'center':undefined}}>
      {loading?<span style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 1s linear infinite',display:'inline-block'}}/>:null}
      {children}
    </button>
  )
}
const Inp = ({value,onChange,placeholder,multi,type,style:s,onKeyDown,rows}) => {
  const base={background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,fontSize:14,padding:'10px 14px',width:'100%',outline:'none',...s}
  return multi
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows||3} style={{...base,resize:'vertical'}}/>
    : <input value={value} onChange={onChange} placeholder={placeholder} type={type||'text'} style={base} onKeyDown={onKeyDown}/>
}
const Stat = ({icon,label,value,color=G.accent}) => (
  <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:13,padding:'15px 16px',display:'flex',gap:11,alignItems:'center'}}>
    <div style={{width:40,height:40,borderRadius:11,background:color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
    <div><div style={{color:G.muted,fontSize:11}}>{label}</div><div className="syne" style={{fontSize:19,fontWeight:800,color}}>{value}</div></div>
  </div>
)
const Spinner = ({color=G.accent}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
    <div style={{width:32,height:32,border:`3px solid ${G.border}`,borderTop:`3px solid ${color}`,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
  </div>
)

// ─── DRIVE VIEWER ─────────────────────────────────────────────────────────────
function DriveViewer({url,title,onBack,accent=G.accent}) {
  const [loading,setLoading]=useState(true)
  const embed=toEmbed(url)
  return (
    <div style={{position:'fixed',inset:0,zIndex:50,background:G.bg,display:'flex',flexDirection:'column'}}>
      {/* Header bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:`1px solid ${G.border}`,flexShrink:0,background:G.surface}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:accent,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4,flexShrink:0}}>← Retour</button>
        <div style={{fontWeight:600,fontSize:14,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:G.text}}>{title}</div>
      </div>
      {/* Content */}
      {embed?(
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          {loading&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,color:G.muted,fontSize:13,background:G.bg}}>
            <div style={{width:28,height:28,border:`3px solid ${G.border}`,borderTop:`3px solid ${accent}`,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>Chargement…
          </div>}
          <iframe src={embed} style={{width:'100%',height:'100%',border:'none',opacity:loading?0:1,transition:'opacity .3s',display:'block'}} onLoad={()=>setLoading(false)} allow="autoplay" title={title}/>
        </div>
      ):(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,color:G.muted,fontSize:13,textAlign:'center',padding:32}}>
          <div style={{fontSize:48}}>🔗</div>
          <div>Aucun fichier Google Drive associé à cette ressource.</div>
        </div>
      )}
    </div>
  )
}

// ─── FILE ATTACHMENT ──────────────────────────────────────────────────────────
// Upload file to Supabase Storage and return public URL
async function uploadFile(file) {
  const ext=file.name.split('.').pop()
  const path=`attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const {data,error}=await supabase.storage.from('talis-files').upload(path,file,{cacheControl:'3600',upsert:false})
  if(error){ console.error('Upload error:',error); return null }
  const {data:pub}=supabase.storage.from('talis-files').getPublicUrl(path)
  return {name:file.name,size:file.size,type:file.type,url:pub.publicUrl,id:Date.now()+Math.random()}
}

function AttachBtn({onFiles}) {
  const ref=useRef()
  const [uploading,setUploading]=useState(false)
  return (
    <>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style={{display:'none'}} onChange={async e=>{
        setUploading(true)
        const files=Array.from(e.target.files)
        const uploaded=await Promise.all(files.map(f=>uploadFile(f)))
        onFiles(uploaded.filter(Boolean))
        e.target.value=''
        setUploading(false)
      }}/>
      <button onClick={()=>ref.current.click()} disabled={uploading} style={{background:'none',border:`1px solid ${G.border}`,borderRadius:8,color:uploading?G.accentGreen:G.muted,cursor:'pointer',padding:'8px 10px',fontSize:18,display:'flex',alignItems:'center',position:'relative'}} title={uploading?'Envoi en cours…':'Joindre un fichier'}>
        {uploading?<span style={{fontSize:12}}>⏳</span>:'📎'}
      </button>
    </>
  )
}
function AttachPreview({files,onRemove}) {
  if(!files?.length) return null
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:5}}>
      {files.map(f=>(
        <div key={f.id} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:8,padding:'4px 9px',fontSize:12,display:'flex',alignItems:'center',gap:5}}>
          <span>{fileIcon(f.type)}</span>
          <span style={{maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
          <span style={{color:G.muted}}>{fmtSize(f.size)}</span>
          {onRemove&&<button onClick={()=>onRemove(f.id)} style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:13}}>×</button>}
        </div>
      ))}
    </div>
  )
}

// ─── MESSAGE THREAD ───────────────────────────────────────────────────────────
function MsgThread({msgs,myRole,onSend,onDelete,loading,onView,onBack,otherName,isTyping,isOnline,onTyping}) {
  const [text,setText]=useState('')
  const [atts,setAtts]=useState([])
  const [sending,setSending]=useState(false)
  const bottomRef=useRef()
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])
  useEffect(()=>{ if(onView) onView() },[msgs.length])

  const send=async()=>{
    if(!text.trim()&&!atts.length) return
    setSending(true)
    await onSend(text,atts)
    setText(''); setAtts([]); setSending(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Fixed header with back button + online status */}
      {onBack&&(
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0 10px',flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4,padding:0}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{otherName}</div>
            <div style={{fontSize:11,color:isOnline?G.accentGreen:G.muted}}>{isTyping?'✍️ en train d\u2019\u00e9crire\u2026':isOnline?'● En ligne':'○ Hors ligne'}</div>
          </div>
        </div>
      )}
      <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column',gap:9,paddingBottom:8}}>
        {loading?<Spinner/>:!msgs.length
          ?<div style={{color:G.muted,textAlign:'center',margin:'auto',fontSize:13}}>Aucun message.</div>
          :msgs.map((m,i)=>{
            const mine=(myRole==='teacher'&&m.from_role==='teacher')||(myRole==='student'&&m.from_role==='student')
            return (
              <div key={m.id||i} style={{display:'flex',flexDirection:mine?'row-reverse':'row',gap:7,alignItems:'flex-end'}}>
                <div style={{maxWidth:'78%'}}>
                  <div style={{background:mine?`linear-gradient(135deg,${G.accent},#8B7FFF)`:G.surface,borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px',fontSize:13,lineHeight:1.5}}>
                    {m.text&&<div>{m.text}</div>}
                    {parseAtts(m.attachments).length>0&&(
                      <div style={{marginTop:m.text?7:0,display:'flex',flexDirection:'column',gap:4}}>
                        {parseAtts(m.attachments).map((a,ai)=>(
                          <a key={ai} href={a.url} download={a.name} target="_blank" rel="noreferrer" style={{background:'rgba(255,255,255,.15)',borderRadius:7,padding:'6px 10px',fontSize:12,color:'inherit',textDecoration:'none',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                            <span>{fileIcon(a.type)}</span>
                            <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
                            <span style={{opacity:.6,fontSize:10,flexShrink:0}}>⬇</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:3,gap:8}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>{m.sent_at?new Date(m.sent_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        {mine&&<span style={{fontSize:10,color:m.read_at?G.accentGreen:'rgba(255,255,255,.3)'}} title={m.read_at?'Lu':'Envoyé'}>{m.read_at?'✓✓':'✓'}</span>}
                        {mine&&onDelete&&m.id&&!m.id.toString().startsWith('tmp-')&&(
                          <button onClick={()=>{ if(window.confirm('Supprimer ce message ?')) onDelete(m.id) }} style={{background:'none',border:'none',color:'rgba(255,255,255,.3)',cursor:'pointer',fontSize:11,padding:'0 2px',lineHeight:1}} title="Supprimer">🗑</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        }
        <div ref={bottomRef}/>
      </div>
      <div style={{flexShrink:0,borderTop:`1px solid ${G.border}`,paddingTop:9,marginTop:3}}>
        <AttachPreview files={atts} onRemove={id=>setAtts(a=>a.filter(f=>f.id!==id))}/>
        <div style={{display:'flex',gap:7,marginTop:6}}>
          <AttachBtn onFiles={f=>setAtts(a=>[...a,...f])}/>
          <Inp value={text} onChange={e=>{
              const v=e.target.value; setText(v)
              if(onTyping) onTyping(v.length>0)
            }} placeholder="Écrire un message…" style={{flex:1}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/>
          <Btn onClick={send} disabled={!text.trim()&&!atts.length} loading={sending}>Envoyer</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── EXCEL IMPORTER ───────────────────────────────────────────────────────────
function ExcelImporter({classes,onImport,onClose}) {
  const [step,setStep]=useState('upload')
  const [rows,setRows]=useState([])
  const [errors,setErrors]=useState([])
  const [importing,setImporting]=useState(false)
  const ref=useRef()

  const handleFile=async(e)=>{
    const file=e.target.files[0]; if(!file) return
    try {
      const XLSX=await import('xlsx')
      const ab=await file.arrayBuffer()
      const wb=XLSX.read(ab)
      const ws=wb.Sheets[wb.SheetNames[0]]
      const data=XLSX.utils.sheet_to_json(ws,{defval:''})
      const valid=[],errs=[]
      data.forEach((r,i)=>{
        const row=i+2
        const keys=Object.keys(r).map(k=>k.toLowerCase().trim())
        const vals=Object.values(r)
        const getCol=(...ns)=>{ for(const n of ns){ const i=keys.findIndex(k=>k===n); if(i!==-1) return String(vals[i]||'').trim() } for(const n of ns){ const i=keys.findIndex(k=>k.includes(n)); if(i!==-1) return String(vals[i]||'').trim() } return '' }
        const firstName=getCol('prénom','prenom','firstname','first name','first_name')
        const lastName=getCol('nom','lastname','last name','last_name','surname')
        const email=getCol('email','mail','courriel','e-mail')
        const className=getCol('classe','class','groupe','group')
        if(!firstName||!lastName){errs.push(`Ligne ${row} : prénom/nom manquant`);return}
        if(!email||!email.includes('@')){errs.push(`Ligne ${row} : email invalide`);return}
        valid.push({firstName,lastName,email:email.toLowerCase(),className})
      })
      setRows(valid);setErrors(errs);setStep('preview')
    } catch(err) {
      alert('Erreur lecture fichier : '+err.message)
    }
  }

  const doImport=async()=>{
    setImporting(true)
    await onImport(rows)
    setImporting(false)
    setStep('done')
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:24,width:'100%',maxWidth:500,maxHeight:'85vh',overflow:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div className="syne" style={{fontWeight:800,fontSize:17}}>📥 Importer des élèves</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:22}}>×</button>
        </div>

        {step==='upload'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:G.surface,border:`2px dashed ${G.border}`,borderRadius:14,padding:24,textAlign:'center'}}>
              <div style={{fontSize:38,marginBottom:8}}>📊</div>
              <div style={{fontWeight:600,marginBottom:5}}>Choisissez votre fichier Excel</div>
              <div style={{color:G.muted,fontSize:13,marginBottom:14}}>Colonnes : Prénom, Nom, Email, Classe</div>
              <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile}/>
              <Btn onClick={()=>ref.current.click()}>Choisir un fichier</Btn>
            </div>
            <div style={{background:G.surface,borderRadius:11,padding:14}}>
              <div style={{fontWeight:600,fontSize:12,marginBottom:9,color:G.gold}}>📋 Exemple de format attendu</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {['Prénom','Nom','Email','Classe'].map(h=>(
                  <div key={h} style={{background:G.card,borderRadius:7,padding:'4px 8px',textAlign:'center',color:G.accent,fontWeight:600,fontSize:11}}>{h}</div>
                ))}
                {['Emma','Dupont','emma@ecole.fr','Terminale A'].map((v,i)=>(
                  <div key={i} style={{background:G.card,borderRadius:7,padding:'4px 8px',textAlign:'center',fontSize:11,color:G.muted}}>{v}</div>
                ))}
              </div>
              <div style={{fontSize:11,color:G.muted,marginTop:10}}>💡 Mot de passe par défaut : <strong style={{color:G.accentGreen}}>talis2024</strong> (l'élève devra le changer à la première connexion)</div>
            </div>
          </div>
        )}

        {step==='preview'&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {errors.length>0&&(
              <div style={{background:G.accentHot+'15',border:`1px solid ${G.accentHot}33`,borderRadius:10,padding:12}}>
                <div style={{fontWeight:600,color:G.accentHot,fontSize:13,marginBottom:5}}>⚠️ {errors.length} ligne(s) ignorée(s)</div>
                {errors.map((e,i)=><div key={i} style={{fontSize:12,color:G.muted}}>{e}</div>)}
              </div>
            )}
            <div style={{background:G.accentGreen+'15',border:`1px solid ${G.accentGreen}33`,borderRadius:10,padding:12}}>
              <div style={{fontWeight:600,color:G.accentGreen,fontSize:13}}>✅ {rows.length} élève(s) prêt(s) à importer</div>
            </div>
            <div style={{maxHeight:200,overflow:'auto',display:'flex',flexDirection:'column',gap:5}}>
              {rows.map((r,i)=>(
                <div key={i} style={{background:G.surface,borderRadius:9,padding:'9px 12px',display:'flex',alignItems:'center',gap:9}}>
                  <Av name={`${r.firstName} ${r.lastName}`} size={28}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{r.firstName} {r.lastName}</div>
                    <div style={{fontSize:11,color:G.muted}}>{r.email}</div>
                  </div>
                  {r.className&&<Bdg color={G.accent}>{r.className}</Bdg>}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:9}}>
              <Btn v="ghost" onClick={()=>setStep('upload')}>← Retour</Btn>
              <Btn v="green" onClick={doImport} full loading={importing}>Importer {rows.length} élève{rows.length>1?'s':''}</Btn>
            </div>
          </div>
        )}

        {step==='done'&&(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:52,marginBottom:10}}>🎉</div>
            <div className="syne" style={{fontWeight:800,fontSize:18,marginBottom:6}}>Import réussi !</div>
            <div style={{color:G.muted,fontSize:13,marginBottom:18}}>{rows.length} élève(s) ajouté(s) dans la base de données.</div>
            <Btn v="green" onClick={onClose} full>Fermer</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
function ChangePwd({onSave,forced,onCancel}) {
  const [old,setOld]=useState('')
  const [p1,setP1]=useState('')
  const [p2,setP2]=useState('')
  const [err,setErr]=useState('')
  const [saving,setSaving]=useState(false)
  const [success,setSuccess]=useState(false)
  const submit=async()=>{
    if(!forced&&!old){setErr('Saisissez votre mot de passe actuel.');return}
    if(p1.length<6){setErr('6 caractères minimum.');return}
    if(p1!==p2){setErr('Les mots de passe ne correspondent pas.');return}
    setSaving(true)
    const ok=await onSave(old,p1)
    if(!ok){setErr('Mot de passe actuel incorrect.');setSaving(false);return}
    setSuccess(true)
    setTimeout(()=>onCancel&&onCancel(),2000)
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:26,width:'100%',maxWidth:340}}>
        {success?(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:48,marginBottom:10}}>✅</div>
            <div className="syne" style={{fontWeight:800,fontSize:17,color:G.accentGreen,marginBottom:6}}>Mot de passe modifié !</div>
            <div style={{color:G.muted,fontSize:13}}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</div>
          </div>
        ):(
          <>
            <div className="syne" style={{fontWeight:800,fontSize:17,marginBottom:5}}>{forced?'🔑 Choisissez votre mot de passe':'🔒 Modifier le mot de passe'}</div>
            {forced&&<div style={{color:G.muted,fontSize:13,marginBottom:14}}>Première connexion — choisissez un mot de passe personnel.</div>}
            <div style={{display:'flex',flexDirection:'column',gap:9,marginTop:14}}>
              {!forced&&<Inp value={old} onChange={e=>setOld(e.target.value)} placeholder="Mot de passe actuel" type="password"/>}
              <Inp value={p1} onChange={e=>setP1(e.target.value)} placeholder="Nouveau mot de passe (min. 6 car.)" type="password"/>
              <Inp value={p2} onChange={e=>setP2(e.target.value)} placeholder="Confirmer" type="password"/>
              {err&&<div style={{color:G.accentHot,fontSize:13}}>{err}</div>}
              <Btn v="green" onClick={submit} full loading={saving}>Enregistrer</Btn>
              {!forced&&<Btn v="ghost" onClick={onCancel} full>Annuler</Btn>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT APP
// ─────────────────────────────────────────────────────────────────────────────
function StudentApp({student,onLogout,onPwdSaved}) {
  const [tab,setTab]=useState('home')
  const [videos,setVideos]=useState([])
  const [fiches,setFiches]=useState([])
  const [quizzes,setQuizzes]=useState([])
  const [msgs,setMsgs]=useState([])
  const [classes,setClasses]=useState([])
  const [results,setResults]=useState({})
  const [loading,setLoading]=useState(true)
  const [driveItem,setDriveItem]=useState(null)
  const [activeQuiz,setActiveQuiz]=useState(null)
  const [qState,setQState]=useState(null)
  const [showPwd,setShowPwd]=useState(student.must_change_password)
  const [showPwdOpt,setShowPwdOpt]=useState(false)
  const [msgLoading,setMsgLoading]=useState(false)
  const [grades,setGrades]=useState([])
  const [studentNotesView,setStudentNotesView]=useState(null)
  const [gameActive,setGameActive]=useState(false)
  const [unreadTeacher,setUnreadTeacher]=useState(()=>{ try{ const k='talis_unread_'+student.id; return parseInt(localStorage.getItem(k)||'0') }catch{ return 0 } })
  const [teacherTyping,setTeacherTyping]=useState(false)
  const [isTypingToTeacher,setIsTypingToTeacher]=useState(false)

  useEffect(()=>{
    loadAll()
    // Realtime: new messages from teacher
    const msgSub=supabase.channel('student-msgs-'+student.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'student_id=eq.'+student.id},
        payload=>{
          // Only add via realtime if it's from teacher (student's own msgs added in sendMsg)
          if(payload.new.from_role==='teacher'){
            setMsgs(m=>{
              // Avoid duplicates
              if(m.find(x=>x.id===payload.new.id)) return m
              return [...m,payload.new]
            })
            setUnreadTeacher(u=>u+1)
          }
          // Update read_at for student's own messages (read receipt from teacher)
          if(payload.new.from_role==='student'){
            setMsgs(m=>m.map(x=>x.id===payload.new.id?payload.new:x))
          }
        })
      .subscribe()
    // Realtime: update read_at on student messages (teacher read them)
    const readSub=supabase.channel('student-read-'+student.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'student_id=eq.'+student.id},
        payload=>{ setMsgs(m=>m.map(x=>x.id===payload.new.id?{...x,read_at:payload.new.read_at}:x)) })
      .subscribe()
    // Realtime: new videos for my class
    const vidSub=supabase.channel('student-vids-'+student.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'video_classes',filter:'class_id=eq.'+student.class_id},
        async()=>{ const {data:vRes}=await supabase.from('video_classes').select('video_id,videos(*)').eq('class_id',student.class_id); setVideos((vRes||[]).map(r=>r.videos).filter(Boolean)) })
      .subscribe()
    // Realtime: new fiches
    const ficSub=supabase.channel('student-fics-'+student.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'fiche_classes',filter:'class_id=eq.'+student.class_id},
        async()=>{ const {data:fRes}=await supabase.from('fiche_classes').select('fiche_id,fiches(*)').eq('class_id',student.class_id); setFiches((fRes||[]).map(r=>r.fiches).filter(Boolean)) })
      .subscribe()
    // Realtime: new quizzes
    const quizSub=supabase.channel('student-quiz-'+student.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'quiz_classes',filter:'class_id=eq.'+student.class_id},
        async()=>{ const {data:qRes}=await supabase.from('quiz_classes').select('quiz_id,quizzes(*,quiz_questions(*))').eq('class_id',student.class_id); setQuizzes((qRes||[]).map(r=>r.quizzes).filter(Boolean)) })
      .subscribe()
    // Presence: use broadcast channel for instant updates + DB for persistence
    const presenceCh=supabase.channel('presence-global')
    presenceCh.on('presence',{event:'sync'},()=>{}).subscribe(async(status)=>{
      if(status==='SUBSCRIBED'){
        await presenceCh.track({student_id:student.id,online:true,ts:Date.now()})
      }
    })
    // Also write to DB for teacher to read on load
    const upsertOnline=()=>supabase.from('presence').upsert({student_id:student.id,is_online:true,last_seen_at:new Date().toISOString()},{onConflict:'student_id'})
    upsertOnline()
    const heartbeat=setInterval(upsertOnline,15000)
    const markOffline=()=>{
      presenceCh.untrack()
      supabase.from('presence').upsert({student_id:student.id,is_online:false,last_seen_at:new Date().toISOString()},{onConflict:'student_id'})
    }
    window.addEventListener('beforeunload',markOffline)
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) markOffline(); else upsertOnline() })

    // Typing: dedicated channel
    const typingCh=supabase.channel('typing-s-'+student.id,{config:{broadcast:{ack:false,self:false}}})
      .on('broadcast',{event:'teacher_typing'},({payload})=>{
        setTeacherTyping(!!payload.typing)
        if(payload.typing) setTimeout(()=>setTeacherTyping(false),4000)
      })
      .subscribe()

    // Student typing callback
    let typingTimer=null
    window._typingCb=(isTyping)=>{
      const ch=supabase.channel('typing-t-'+student.id,{config:{broadcast:{ack:false,self:false}}})
      ch.subscribe((s)=>{
        if(s==='SUBSCRIBED') ch.send({type:'broadcast',event:'student_typing',payload:{student_id:student.id,typing:isTyping}})
      })
      if(isTyping){
        clearTimeout(typingTimer)
        typingTimer=setTimeout(()=>window._typingCb&&window._typingCb(false),3000)
      }
    }

    return ()=>{
      msgSub.unsubscribe(); readSub.unsubscribe(); vidSub.unsubscribe(); ficSub.unsubscribe(); quizSub.unsubscribe()
      typingCh.unsubscribe(); presenceCh.unsubscribe(); clearInterval(heartbeat)
      window.removeEventListener('beforeunload',markOffline); markOffline()
      window._typingCb=null
    }
  },[])

  useEffect(()=>{
    localStorage.setItem('talis_unread_'+student.id, String(unreadTeacher))
  },[unreadTeacher])

  const loadAll=async()=>{
    setLoading(true)
    const {data:cls}=await supabase.from('classes').select('*')
    setClasses(cls||[])
    const [vRes,fRes,qRes,rRes,mRes]=await Promise.all([
      supabase.from('video_classes').select('video_id,videos(*)').eq('class_id',student.class_id),
      supabase.from('fiche_classes').select('fiche_id,fiches(*)').eq('class_id',student.class_id),
      supabase.from('quiz_classes').select('quiz_id,quizzes(*,quiz_questions(*))').eq('class_id',student.class_id),
      supabase.from('quiz_results').select('*').eq('student_id',student.id),
      supabase.from('messages').select('*').eq('student_id',student.id).order('sent_at'),
    ])
    setVideos((vRes.data||[]).map(r=>r.videos).filter(Boolean))
    setFiches((fRes.data||[]).map(r=>r.fiches).filter(Boolean))
    setQuizzes((qRes.data||[]).map(r=>r.quizzes).filter(Boolean))
    const resMap={}
    ;(rRes.data||[]).forEach(r=>{ resMap[r.quiz_id]=r })
    setResults(resMap)
    setMsgs(mRes.data||[])
    // Load student grades + all scores for class stats (no names)
    const {data:gData}=await supabase.from('grade_scores').select('*,grades(title,coefficient,grade_classes(class_id),grade_scores(score))').eq('student_id',student.id)
    setGrades((gData||[]).map(gs=>{
      const g=gs.grades; if(!g) return null
      if(!g.grade_classes?.some(gc=>gc.class_id===student.class_id)) return null
      const allScores=(g.grade_scores||[]).map(s=>parseFloat(s.score)).filter(n=>!isNaN(n))
      const classAvg=allScores.length?Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length*10)/10:null
      const classMin=allScores.length?Math.min(...allScores):null
      const classMax=allScores.length?Math.max(...allScores):null
      return {...g,score:gs.score,classAvg,classMin,classMax}
    }).filter(Boolean))
    setLoading(false)
  }

  const startQuiz=q=>{
    const done=results[q.id]
    if(done&&done.score>=q.pass_score) return
    const sorted=[...(q.quiz_questions||[])].sort((a,b)=>a.position-b.position)
    setActiveQuiz({...q,questions:sorted})
    setQState({idx:0,ans:[],done:false})
  }

  const answerQ=async ci=>{
    const a=[...qState.ans,ci]
    const q=activeQuiz
    if(qState.idx+1>=q.questions.length){
      const correct=a.filter((x,i)=>x===q.questions[i].answer_index).length
      const pct=Math.round((correct/q.questions.length)*100)
      setQState({...qState,ans:a,done:true,score:pct,correct})
      // Save result (upsert: if retry allowed and already exists, update)
      await supabase.from('quiz_results').upsert({student_id:student.id,quiz_id:q.id,score:pct},{onConflict:'student_id,quiz_id'})
      // Update progress
      const newProg=Math.min(100,(student.progress||0)+4)
      await supabase.from('students').update({progress:newProg}).eq('id',student.id)
      setResults(r=>({...r,[q.id]:{score:pct}}))
    } else setQState({...qState,idx:qState.idx+1,ans:a})
  }

  const sendMsg=async(text,atts)=>{
    const msg={student_id:student.id,from_role:'student',text,attachments:atts.map(({name,type,size,url})=>({name,type,size,url}))}
    const {data}=await supabase.from('messages').insert(msg).select().single()
    if(data) setMsgs(m=>[...m,data])
    // Mark all teacher messages as read when student sends
    await supabase.from('messages').update({read_at:new Date().toISOString()}).eq('student_id',student.id).eq('from_role','teacher').is('read_at',null)

  }

  const deleteMsg=async(msgId)=>{
    await supabase.from('messages').delete().eq('id',msgId)
    setMsgs(m=>m.filter(x=>x.id!==msgId))
  }

  const savePwd=async(oldPwd,newPwd)=>{
    if(!student.must_change_password&&student.password_hash!==oldPwd) return false
    await supabase.from('students').update({password_hash:newPwd,must_change_password:false}).eq('id',student.id)
    onPwdSaved(newPwd)
    setShowPwd(false)
    setShowPwdOpt(false)
    return true
  }

  const myClass=classes.find(c=>c.id===student.class_id)
  const fullName=`${student.first_name} ${student.last_name}`
  const isNDRC=myClass&&myClass.name.toUpperCase().includes('NDRC')
  const tabs=[{id:'home',icon:'⚡',label:'Accueil'},{id:'videos',icon:'🎬',label:'Vidéos'},{id:'fiches',icon:'📄',label:'Fiches'},{id:'quiz',icon:'🧠',label:'Quiz'},{id:'notes',icon:'📝',label:'Notes'},...(isNDRC?[{id:'game',icon:'🎮',label:'Jeu'}]:[]),(  {id:'msgs',icon:'💬',label:'Messages'})]

  if(loading) return <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,background:G.bg}}><Spinner/><div style={{color:G.muted,fontSize:13}}>Chargement…</div></div>

  return (
    <div className="app-root">
      {(showPwd||showPwdOpt)&&<ChangePwd forced={showPwd} onSave={savePwd} onCancel={()=>setShowPwdOpt(false)}/>}

      <div style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:9,flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
        <img src="/logo.jpg" alt="Talis" style={{height:32,width:'auto',borderRadius:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div className="syne" style={{fontWeight:700,fontSize:13}}>Bonjour, {student.first_name} 👋</div>
          {myClass&&<Bdg color={myClass.color} sm>{myClass.name}</Bdg>}
        </div>
        <button onClick={()=>setShowPwdOpt(true)} style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:15}} title="Modifier mot de passe">🔒</button>
        <button onClick={onLogout} style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:15}} title="Déconnexion">🚪</button>
      </div>

      <div style={{flex:1,position:'relative',minHeight:0,display:'flex',flexDirection:'column'}}>
      <div className="app-scroll" style={{padding:16,flex:1}}>

        {tab==='home'&&!driveItem&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:13}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>Mon tableau de bord</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div onClick={()=>setTab('videos')} className="hov"><Stat icon="🎬" label="Vidéos" value={videos.length} color={G.accent}/></div>
              <div onClick={()=>setTab('quiz')} className="hov"><Stat icon="🧠" label="Quiz faits" value={Object.keys(results).length} color={G.accentHot}/></div>
              <div onClick={()=>setTab('fiches')} className="hov"><Stat icon="📄" label="Fiches" value={fiches.length} color={G.accentCyan}/></div>
              <div onClick={()=>{setTab('msgs');setUnreadTeacher(0)}} className="hov"><Stat icon="💬" label="Non lus" value={unreadTeacher} color={G.gold}/></div>
            </div>
            {videos.slice(0,2).map(v=>(
              <div key={v.id} onClick={()=>{setDriveItem(v);setTab('videos')}} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:13,padding:13,display:'flex',alignItems:'center',gap:11,cursor:'pointer'}}>
                <div style={{fontSize:26}}>{v.emoji||'🎬'}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{v.title}</div><div style={{color:G.muted,fontSize:11}}>{v.section} · {v.duration}</div></div>
                <div style={{color:G.accent}}>▶</div>
              </div>
            ))}
          </div>
        )}

        {tab==='videos'&&(
          <div className="fade-up" style={{height:'100%'}}>
            {driveItem?<DriveViewer url={driveItem.drive_url} title={driveItem.title} onBack={()=>setDriveItem(null)} accent={G.accent}/>:(
              <>
                <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:13}}>🎬 Vidéos</div>
                {!videos.length&&<div style={{color:G.muted,fontSize:13}}>Aucune vidéo pour ta classe.</div>}
                {videos.map(v=>(
                  <div key={v.id} onClick={()=>setDriveItem(v)} className="hov" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:13,overflow:'hidden',marginBottom:9}}>
                    <div style={{height:76,background:`linear-gradient(135deg,${G.accent}33,${G.accentHot}22)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38}}>{v.emoji||'🎬'}</div>
                    <div style={{padding:12}}><Bdg color={G.accent}>{v.section}</Bdg><div style={{fontWeight:500,margin:'5px 0 3px',fontSize:13}}>{v.title}</div><div style={{color:G.muted,fontSize:12}}>{v.duration}</div></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab==='fiches'&&(
          <div className="fade-up" style={{height:'100%'}}>
            {driveItem?<DriveViewer url={driveItem.drive_url} title={driveItem.title} onBack={()=>setDriveItem(null)} accent={G.accentCyan}/>:(
              <>
                <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:13}}>📄 Fiches de révision</div>
                {!fiches.length&&<div style={{color:G.muted,fontSize:13}}>Aucune fiche pour ta classe.</div>}
                {fiches.map(f=>(
                  <div key={f.id} onClick={()=>setDriveItem(f)} className="hov" style={{background:G.card,border:`1px solid ${(f.color||G.accent)+'33'}`,borderRadius:13,padding:14,marginBottom:9,borderLeft:`3px solid ${f.color||G.accent}`}}>
                    <Bdg color={f.color||G.accent}>{f.section}</Bdg>
                    <div style={{fontWeight:600,fontSize:13,marginTop:6}}>{f.title}</div>
                    <div style={{color:G.muted,fontSize:12,marginTop:3}}>Appuyer pour lire →</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab==='quiz'&&(
          <div className="fade-up">
            {activeQuiz&&qState&&!qState.done?(
              <div>
                <div style={{color:G.muted,fontSize:12,marginBottom:6}}>Question {qState.idx+1}/{activeQuiz.questions.length}</div>
                <PBar value={(qState.idx/activeQuiz.questions.length)*100} color={G.accent}/>
                <div className="syne" style={{fontWeight:700,fontSize:16,margin:'16px 0 18px',lineHeight:1.45}}>{activeQuiz.questions[qState.idx].question}</div>
                {(activeQuiz.questions[qState.idx].choices||[]).map((c,i)=>(
                  <div key={i} onClick={()=>answerQ(i)} className="hov" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:11,padding:'12px 15px',marginBottom:8,display:'flex',alignItems:'center',gap:9}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:G.accent+'22',color:G.accent,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>{['A','B','C','D'][i]}</div>
                    <span style={{fontSize:13}}>{c}</span>
                  </div>
                ))}
              </div>
            ):activeQuiz&&qState?.done?(
              <div style={{textAlign:'center',padding:'28px 14px'}}>
                <div style={{fontSize:56,marginBottom:10}}>{qState.score>=activeQuiz.pass_score?'🏆':'💪'}</div>
                <div className="syne" style={{fontSize:24,fontWeight:800,color:qState.score>=activeQuiz.pass_score?G.accentGreen:G.accentHot}}>{qState.score}%</div>
                <div style={{color:G.muted,margin:'5px 0 7px'}}>{qState.correct}/{activeQuiz.questions.length} bonne{qState.correct>1?'s':''} réponse{qState.correct>1?'s':''}</div>
                {qState.score<activeQuiz.pass_score
                  ?<div style={{color:G.gold,fontSize:13,marginBottom:18}}>En dessous de {activeQuiz.pass_score}% — tu pourras réessayer.</div>
                  :<div style={{color:G.accentGreen,fontSize:13,marginBottom:18}}>Quiz validé ✓</div>
                }
                <Btn onClick={()=>{setActiveQuiz(null);setQState(null)}}>← Retour</Btn>
              </div>
            ):(
              <>
                <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:13}}>🧠 Quiz</div>
                {!quizzes.length&&<div style={{color:G.muted,fontSize:13}}>Aucun quiz pour ta classe.</div>}
                {quizzes.map(q=>{
                  const done=results[q.id]
                  const passed=done&&done.score>=q.pass_score
                  return (
                    <div key={q.id} style={{background:G.card,border:`1px solid ${passed?G.accentGreen+'44':G.border}`,borderRadius:13,padding:14,marginBottom:9}}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                        <div style={{fontWeight:600,fontSize:13,flex:1}}>{q.title}</div>
                        {passed&&<Bdg color={G.accentGreen}>✓ Validé</Bdg>}
                        {done&&!passed&&<Bdg color={G.gold}>Réessayer</Bdg>}
                      </div>
                      <div style={{color:G.muted,fontSize:12,marginBottom:9}}>
                        {(q.quiz_questions||[]).length} question{(q.quiz_questions||[]).length>1?'s':''} · Seuil : {q.pass_score}%
                        {done&&<span style={{marginLeft:7,color:done.score>=q.pass_score?G.accentGreen:G.accentHot}}>· Dernier : {done.score}%</span>}
                      </div>
                      {!passed&&<Btn sm onClick={()=>startQuiz(q)}>Commencer ▶</Btn>}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {tab==='notes'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>📝 Mes notes</div>
            {grades.length===0&&<div style={{color:G.muted,fontSize:13}}>Aucune note publiée pour le moment.</div>}

            {/* LEVEL 1: global weighted average — clickable */}
            {grades.length>0&&!studentNotesView&&(()=>{
              const total=grades.reduce((a,g)=>a+(parseFloat(g.score)||0)*g.coefficient,0)
              const coeffs=grades.reduce((a,g)=>a+g.coefficient,0)
              const avg=coeffs?Math.round(total/coeffs*10)/10:0
              const aboveClassAvg=grades.filter(g=>g.classAvg!==null&&parseFloat(g.score)>=g.classAvg).length
              return (
                <div onClick={()=>setStudentNotesView('list')} className="hov" style={{background:G.card,border:`1px solid ${G.accent}33`,borderRadius:14,padding:18,cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div className="syne" style={{fontWeight:800,fontSize:15}}>Moyenne générale</div>
                      <div style={{color:G.muted,fontSize:12,marginTop:2}}>{grades.length} devoir{grades.length>1?'s':''} · Voir le détail →</div>
                    </div>
                    <div className="syne" style={{fontSize:30,fontWeight:800,color:avg>=10?G.accentGreen:G.accentHot}}>{avg}/20</div>
                  </div>
                  <PBar value={(avg/20)*100} color={avg>=10?G.accentGreen:G.accentHot}/>
                  <div style={{marginTop:10,fontSize:12,color:G.muted}}>
                    Au-dessus de la moyenne de classe sur <strong style={{color:G.accentGreen}}>{aboveClassAvg}</strong> devoir{aboveClassAvg>1?'s':''} / {grades.length}
                  </div>
                </div>
              )
            })()}

            {/* LEVEL 2: list of grades — avg class only */}
            {studentNotesView==='list'&&(
              <>
                <button onClick={()=>setStudentNotesView(null)} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4}}>← Retour</button>
                {grades.map((g,i)=>(
                  <div key={i} onClick={()=>setStudentNotesView(i)} className="hov" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:13,padding:14,cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:14}}>{g.title}</div>
                        <Bdg color={G.muted}>Coeff. {g.coefficient}</Bdg>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div className="syne" style={{fontSize:20,fontWeight:800,color:g.classAvg>=10?G.accentGreen:G.accentHot}}>{g.classAvg??'—'}/20</div>
                        <div style={{fontSize:10,color:G.muted}}>Moy. classe</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* LEVEL 3: detail of one grade */}
            {studentNotesView!==null&&studentNotesView!=='list'&&(()=>{
              const g=grades[studentNotesView]; if(!g) return null
              const myScore=parseFloat(g.score)
              const color=myScore>=10?G.accentGreen:G.accentHot
              const aboveAvg=g.classAvg!==null&&myScore>=g.classAvg
              return (
                <>
                  <button onClick={()=>setStudentNotesView('list')} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4}}>← Retour</button>
                  <div style={{background:G.card,border:`1px solid ${color}33`,borderRadius:13,padding:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <div style={{flex:1}}>
                        <div className="syne" style={{fontWeight:700,fontSize:15}}>{g.title}</div>
                        <Bdg color={G.muted}>Coeff. {g.coefficient}</Bdg>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div className="syne" style={{fontSize:28,fontWeight:800,color,lineHeight:1}}>{myScore}/20</div>
                        <div style={{fontSize:11,color:aboveAvg?G.accentGreen:G.accentHot,fontWeight:600,marginTop:2}}>
                          {aboveAvg?'↑ Au-dessus':'↓ En dessous'}
                        </div>
                      </div>
                    </div>
                    <PBar value={(myScore/20)*100} color={color}/>
                    {g.classAvg!==null&&(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:12}}>
                        {[['📉 Plus basse',g.classMin,G.accentHot],['📊 Moyenne',g.classAvg,G.gold],['📈 Plus haute',g.classMax,G.accentGreen]].map(([label,val,c])=>(
                          <div key={label} style={{background:G.surface,borderRadius:8,padding:'7px 8px',textAlign:'center'}}>
                            <div style={{fontSize:9,color:G.muted,marginBottom:3}}>{label}</div>
                            <div className="syne" style={{fontSize:16,fontWeight:800,color:c}}>{val}/20</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        )}


        {tab==='msgs'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:8}}>💬 Messages</div>
            <MsgThread
              msgs={msgs} myRole="student"
              onSend={sendMsg} onDelete={deleteMsg}
              loading={msgLoading}
              isTyping={teacherTyping}
              isOnline={true}
              otherName="Benoit Resche"
              onTyping={(isT)=>{ if(window._typingCb) window._typingCb(isT) }}
              onView={()=>{
                setUnreadTeacher(0)
                try{localStorage.setItem('talis_unread_'+student.id,'0')}catch{}
                // Mark unread teacher messages as read
                const unread=msgs.filter(m=>m.from_role==='teacher'&&!m.read_at)
                if(unread.length){
                  unread.forEach(m=>{
                    supabase.from('messages').update({read_at:new Date().toISOString()}).eq('id',m.id).then(()=>{
                      setMsgs(prev=>prev.map(x=>x.id===m.id?{...x,read_at:new Date().toISOString()}:x))
                    })
                  })
                }
              }}
            />
          </div>
        )}
      </div>

      {tab==='game'&&!gameActive&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:G.bg,display:'flex',flexDirection:'column',overflow:'auto'}}>
          <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>🎮 Jeux pédagogiques NDRC</div>
            {/* Game 1: available */}
            <div onClick={()=>setGameActive(true)} className="hov" style={{background:G.card,border:`1px solid ${G.accent}33`,borderRadius:14,padding:18,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${G.accent},#8B7FFF)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏙️</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15}}>La quête du référencement</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Stratégie commerciale · Distributeur 3D</div>
                </div>
                <div style={{background:G.accentGreen+'22',color:G.accentGreen,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>▶ Jouer</div>
              </div>
            </div>
            {/* Game 2: coming soon */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,opacity:.6}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:G.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15,color:G.muted}}>Jeu 2</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Bientôt disponible</div>
                </div>
                <div style={{background:G.border,color:G.muted,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>À venir</div>
              </div>
            </div>
            {/* Game 3: coming soon */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,opacity:.6}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:G.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15,color:G.muted}}>Jeu 3</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Bientôt disponible</div>
                </div>
                <div style={{background:G.border,color:G.muted,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>À venir</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab==='game'&&gameActive&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:'#0a0a1a',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(0,0,0,.5)',flexShrink:0}}>
            <button onClick={()=>setGameActive(false)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4}}>← Quitter</button>
            <div style={{color:'#fff',fontSize:13,fontWeight:600}}>La quête du référencement</div>
          </div>
          <iframe src="/game.html" style={{flex:1,width:'100%',border:'none',display:'block'}} title="Jeu"/>
        </div>
      )}
      </div>
      <div className="app-nav" style={{display:'flex',background:G.surface,borderTop:`1px solid ${G.border}`,padding:'8px 2px 10px'}}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>{setTab(t.id);setDriveItem(null);if(t.id!=='quiz'){setActiveQuiz(null);setQState(null)}if(t.id==='msgs'){setUnreadTeacher(0);try{localStorage.setItem('talis_unread_'+student.id,'0')}catch{}}if(t.id!=='notes')setStudentNotesView(null);if(t.id!=='game')setGameActive(false)}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer',position:'relative'}}>
            <div style={{fontSize:18,filter:tab===t.id?'none':'grayscale(1) opacity(.4)',transition:'filter .16s'}}>{t.icon}</div>
            <div style={{fontSize:9,color:tab===t.id?G.accent:G.muted,fontWeight:tab===t.id?600:400}}>{t.label}</div>
            {t.id==='msgs'&&unreadTeacher>0&&<div style={{position:'absolute',top:0,right:'18%',width:7,height:7,borderRadius:'50%',background:G.accentHot}}/>}
            {tab===t.id&&<div style={{position:'absolute',bottom:-9,width:16,height:2,background:G.accent,borderRadius:2}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QUIZ EXCEL IMPORTER ─────────────────────────────────────────────────────
function QuizExcelImporter({onImport, currentCount}) {
  const ref=useRef()
  const [preview,setPreview]=useState(null)
  const [loading,setLoading]=useState(false)

  const handleFile=async(e)=>{
    const file=e.target.files[0]; if(!file) return
    setLoading(true)
    try {
      const XLSX=await import('xlsx')
      const ab=await file.arrayBuffer()
      const wb=XLSX.read(ab)
      const ws=wb.Sheets[wb.SheetNames[0]]
      const data=XLSX.utils.sheet_to_json(ws,{defval:''})
      const questions=[]
      const errors=[]
      data.forEach((row,i)=>{
        const keys=Object.keys(row).map(k=>k.toLowerCase().trim())
        const vals=Object.values(row)
        const get=(...ns)=>{ for(const n of ns){ const idx=keys.findIndex(k=>k.includes(n)); if(idx!==-1) return String(vals[idx]||'').trim() } return '' }
        const q=get('question','énoncé','enonce','q')
        const a=get('choix a','choice a','a','réponse a','rep a')
        const b=get('choix b','choice b','b','réponse b','rep b')
        const c=get('choix c','choice c','c','réponse c','rep c')
        const d=get('choix d','choice d','d','réponse d','rep d')
        const ans=get('bonne réponse','bonne reponse','réponse','reponse','answer','correct','bonne','correcte').toUpperCase().trim()
        if(!q){errors.push(`Ligne ${i+2} : question vide`);return}
        if(!a||!b){errors.push(`Ligne ${i+2} : au moins 2 choix requis`);return}
        const ansIdx={'A':0,'B':1,'C':2,'D':3}[ans]
        if(ansIdx===undefined){errors.push(`Ligne ${i+2} : bonne réponse invalide (mettez A, B, C ou D)`);return}
        questions.push({q,choices:[a,b,c||'',d||''].filter((_,i)=>i<2||(i===2&&c)||(i===3&&d)),answer:ansIdx})
      })
      if(errors.length>0) alert('⚠️ Erreurs :\n'+errors.join('\n'))
      if(questions.length>0) setPreview(questions)
    } catch(err){
      alert('Erreur lecture : '+err.message)
    }
    setLoading(false)
    e.target.value=''
  }

  if(preview) return (
    <div style={{background:G.surface,borderRadius:10,padding:12}}>
      <div style={{fontWeight:600,fontSize:12,color:G.accentGreen,marginBottom:8}}>✅ {preview.length} question(s) importée(s)</div>
      <div style={{maxHeight:160,overflow:'auto',display:'flex',flexDirection:'column',gap:5,marginBottom:10}}>
        {preview.map((q,i)=>(
          <div key={i} style={{background:G.card,borderRadius:7,padding:'7px 10px'}}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:3}}>{q.q}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {q.choices.map((c,ci)=>(
                <span key={ci} style={{fontSize:10,padding:'2px 7px',borderRadius:5,background:ci===q.answer?G.accentGreen+'33':G.border,color:ci===q.answer?G.accentGreen:G.muted,fontWeight:ci===q.answer?700:400}}>
                  {['A','B','C','D'][ci]}: {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:7}}>
        <Btn sm v="green" onClick={()=>{onImport(preview);setPreview(null)}}>Utiliser ces questions</Btn>
        <Btn sm v="ghost" onClick={()=>setPreview(null)}>Annuler</Btn>
      </div>
    </div>
  )

  return (
    <div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile}/>
      <div style={{border:`1px dashed ${G.gold}55`,borderRadius:9,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,background:G.gold+'08'}}>
        <div style={{fontSize:20}}>📊</div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:G.gold}}>Importer depuis Excel</div>
          <div style={{fontSize:10,color:G.muted}}>Colonnes : Question, Choix A, Choix B, Choix C, Choix D, Bonne réponse (A/B/C/D)</div>
        </div>
        <Btn sm v="ghost" onClick={()=>ref.current.click()} loading={loading}>Importer</Btn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER APP
// ─────────────────────────────────────────────────────────────────────────────
function TeacherApp({onLogout}) {
  const [tab,setTab]=useState('dashboard')
  const [students,setStudents]=useState([])
  const [classes,setClasses]=useState([])
  const [videos,setVideos]=useState([])
  const [fiches,setFiches]=useState([])
  const [quizzes,setQuizzes]=useState([])
  const [msgs,setMsgs]=useState({})
  const [loading,setLoading]=useState(true)
  const [selStudent,setSelStudent]=useState(null)
  const [selClass,setSelClass]=useState('all')
  const [showImport,setShowImport]=useState(false)
  const [drivePreview,setDrivePreview]=useState(null)
  const [form,setForm]=useState({vClassIds:[],fClassIds:[]})
  const [quiz,setQuiz]=useState({title:'',classIds:[],passScore:80,questions:[{q:'',choices:['','','',''],answer:0}]})
  const [newClassName,setNewClassName]=useState('')
  const [saving,setSaving]=useState(false)
  const [gameActive,setGameActive]=useState(false)
  const [presence,setPresence]=useState({})
  const [grades,setGrades]=useState([]) // [{id,title,coefficient,classIds,scores:{studentId:note}}]
  const [gradeForm,setGradeForm]=useState({title:'',coefficient:1,classIds:[],scores:{}})
  const [editingGrade,setEditingGrade]=useState(null) // grade being edited
  const [notesView,setNotesView]=useState(null) // null=overview, 'list'=all grades, gradeId=detail
  const [studentTyping,setStudentTyping]=useState({}) // {studentId: bool}
  const [readMsgs,setReadMsgs]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('talis_read_msgs')||'{}') }catch{ return {} } })
  const sessionStart=useState(()=>new Date().toISOString())[0]

  useEffect(()=>{
    loadAll()
    // Realtime: new messages from students
    const msgSub=supabase.channel('teacher-msgs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},
        payload=>{
          const m=payload.new; const sid=m.student_id
          if(m.from_role==='student'){
            setMsgs(prev=>({...prev,[sid]:[...(prev[sid]||[]).filter(x=>x.id!==m.id),m]}))
          }
        })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages'},
        payload=>{
          const m=payload.new; const sid=m.student_id
          setMsgs(prev=>({...prev,[sid]:(prev[sid]||[]).map(x=>x.id===m.id?{...x,read_at:m.read_at}:x)}))
        })
      .subscribe()
    // Realtime: new students
    const stuSub=supabase.channel('teacher-students')
      .on('postgres_changes',{event:'*',schema:'public',table:'students'},()=>loadAll())
      .subscribe()
    // Presence: load from DB on start
    supabase.from('presence').select('*').then(({data})=>{
      if(data){ const p={}; data.forEach(r=>p[r.student_id]={is_online:r.is_online,last_seen_at:r.last_seen_at}); setPresence(p) }
    })
    // Presence: listen to broadcast channel for real-time updates
    const presenceCh=supabase.channel('presence-global')
      .on('presence',{event:'join'},({newPresences})=>{
        newPresences.forEach(p=>{ if(p.student_id) setPresence(prev=>({...prev,[p.student_id]:{is_online:true,last_seen_at:new Date().toISOString()}})) })
      })
      .on('presence',{event:'leave'},({leftPresences})=>{
        leftPresences.forEach(p=>{ if(p.student_id) setPresence(prev=>({...prev,[p.student_id]:{is_online:false,last_seen_at:new Date().toISOString()}})) })
      })
      .subscribe()
    // Also poll DB every 30s for accuracy
    const presencePoll=setInterval(()=>{
      supabase.from('presence').select('*').then(({data})=>{
        if(data){ const p={}; data.forEach(r=>p[r.student_id]={is_online:r.is_online,last_seen_at:r.last_seen_at}); setPresence(p) }
      })
    },30000)
    // Subscribe to student typing channels
    const typingChannels={}
    const subscribeTyping=(sid)=>{
      if(typingChannels[sid]) return
      typingChannels[sid]=supabase.channel('typing-t-'+sid,{config:{broadcast:{ack:false,self:false}}})
        .on('broadcast',{event:'student_typing'},({payload})=>{
          setStudentTyping(t=>({...t,[payload.student_id]:true}))
          setTimeout(()=>setStudentTyping(t=>({...t,[payload.student_id]:false})),4000)
        })
        .subscribe()
    }
    supabase.from('students').select('id').then(({data})=>data?.forEach(s=>subscribeTyping(s.id)))

    return ()=>{
      msgSub.unsubscribe(); stuSub.unsubscribe(); presenceCh.unsubscribe()
      clearInterval(presencePoll)
      Object.values(typingChannels).forEach(c=>c.unsubscribe())
    }
  },[])

  useEffect(()=>{
    localStorage.setItem('talis_read_msgs', JSON.stringify(readMsgs))
  },[readMsgs])

  const loadAll=async()=>{
    setLoading(true)
    const [clsR,stuR,vidR,ficR,quizR]=await Promise.all([
      supabase.from('classes').select('*').order('name'),
      supabase.from('students').select('*,classes(name,color)').order('last_name'),
      supabase.from('videos').select('*,video_classes(class_id)').order('created_at',{ascending:false}),
      supabase.from('fiches').select('*,fiche_classes(class_id)').order('created_at',{ascending:false}),
      supabase.from('quizzes').select('*,quiz_classes(class_id),quiz_questions(*)').order('created_at',{ascending:false}),
    ])
    setClasses(clsR.data||[])
    setStudents(stuR.data||[])
    setVideos((vidR.data||[]).map(v=>({...v,classIds:(v.video_classes||[]).map(vc=>vc.class_id)})))
    setFiches((ficR.data||[]).map(f=>({...f,classIds:(f.fiche_classes||[]).map(fc=>fc.class_id)})))
    setQuizzes((quizR.data||[]).map(q=>({...q,classIds:(q.quiz_classes||[]).map(qc=>qc.class_id)})))

    // Load all messages grouped by student
    const {data:allMsgs}=await supabase.from('messages').select('*').order('sent_at')
    const grouped={}
    ;(allMsgs||[]).forEach(m=>{ if(!grouped[m.student_id]) grouped[m.student_id]=[]; grouped[m.student_id].push(m) })
    setMsgs(grouped)
    // Load grades
    const {data:gradesData}=await supabase.from('grades').select('*,grade_classes(class_id),grade_scores(*)').order('created_at',{ascending:false})
    if(gradesData){
      setGrades(gradesData.map(g=>({
        ...g,
        classIds:(g.grade_classes||[]).map(gc=>gc.class_id),
        scores:Object.fromEntries((g.grade_scores||[]).map(s=>[s.student_id,s.score]))
      })))
    }
    setLoading(false)
  }

  const addClass=async()=>{
    if(!newClassName.trim()) return
    const color=CLASS_COLORS[classes.length%CLASS_COLORS.length]
    const {data}=await supabase.from('classes').insert({name:newClassName.trim(),color}).select().single()
    if(data){setClasses(c=>[...c,data]);setNewClassName('')}
  }

  const handleImport=async(rows)=>{
    const errors=[]
    // Create missing classes first
    const classMap={...Object.fromEntries(classes.map(c=>[c.name.toLowerCase(),c.id]))}
    const newClassNames=[...new Set(rows.map(r=>r.className).filter(n=>n&&!classMap[n.toLowerCase()]))]
    for(let i=0;i<newClassNames.length;i++){
      const name=newClassNames[i]
      const color=CLASS_COLORS[(classes.length+i)%CLASS_COLORS.length]
      const {data,error}=await supabase.from('classes').insert({name,color}).select().single()
      if(data) classMap[name.toLowerCase()]=data.id
      if(error) errors.push('Classe "'+name+'" : '+error.message)
    }
    // Insert students one by one
    let ok=0
    for(const r of rows){
      const classId=r.className?classMap[r.className.toLowerCase()]||null:null
      const {error}=await supabase.from('students').upsert({
        first_name:r.firstName, last_name:r.lastName, email:r.email,
        password_hash:'talis2024', must_change_password:true,
        class_id:classId, progress:0
      },{onConflict:'email'})
      if(error) errors.push(r.email+' : '+error.message)
      else ok++
    }
    if(errors.length>0){
      alert('⚠️ '+ok+' élève(s) importé(s).\n\nErreurs :\n'+errors.slice(0,5).join('\n'))
    } else {
      alert('✅ '+ok+' élève(s) importé(s) avec succès !')
    }
    await loadAll()
  }

  const addVideo=async()=>{
    if(!form.vTitle||!form.vClassIds?.length) return
    setSaving(true)
    const {data:v}=await supabase.from('videos').insert({title:form.vTitle,section:form.vSection||'Général',duration:form.vDur||'—',emoji:form.vEmoji||'🎬',drive_url:form.vUrl||''}).select().single()
    if(v){
      await supabase.from('video_classes').insert(form.vClassIds.map(cid=>({video_id:v.id,class_id:cid})))
      setVideos(vs=>[{...v,classIds:form.vClassIds},...vs])
      setForm({vClassIds:[],fClassIds:[]})
      alert('✅ Vidéo publiée !')
    }
    setSaving(false)
  }

  const addFiche=async()=>{
    if(!form.fTitle||!form.fClassIds?.length) return
    setSaving(true)
    const color=CLASS_COLORS[Math.floor(Math.random()*CLASS_COLORS.length)]
    const {data:f}=await supabase.from('fiches').insert({title:form.fTitle,section:form.fSection||'Général',drive_url:form.fUrl||'',color}).select().single()
    if(f){
      await supabase.from('fiche_classes').insert(form.fClassIds.map(cid=>({fiche_id:f.id,class_id:cid})))
      setFiches(fs=>[{...f,classIds:form.fClassIds},...fs])
      setForm({vClassIds:[],fClassIds:[]})
      alert('✅ Fiche publiée !')
    }
    setSaving(false)
  }

  const addQuiz=async()=>{
    if(!quiz.title||!quiz.classIds.length) return
    setSaving(true)
    const {data:q}=await supabase.from('quizzes').insert({title:quiz.title,pass_score:quiz.passScore}).select().single()
    if(q){
      await supabase.from('quiz_classes').insert(quiz.classIds.map(cid=>({quiz_id:q.id,class_id:cid})))
      const validQs=quiz.questions.filter(x=>x.q&&x.choices[0])
      await supabase.from('quiz_questions').insert(validQs.map((x,i)=>({quiz_id:q.id,question:x.q,choices:x.choices,answer_index:x.answer,position:i})))
      setQuizzes(qs=>[{...q,classIds:quiz.classIds,quiz_questions:validQs.map((x,i)=>({question:x.q,choices:x.choices,answer_index:x.answer,position:i}))},...qs])
      setQuiz({title:'',classIds:[],passScore:80,questions:[{q:'',choices:['','','',''],answer:0}]})
      alert('✅ Quiz publié !')
    }
    setSaving(false)
  }

  const deleteContent=async(type,id)=>{
    if(!confirm('Supprimer ce contenu ?')) return
    const table=type==='video'?'videos':type==='fiche'?'fiches':'quizzes'
    await supabase.from(table).delete().eq('id',id)
    if(type==='video') setVideos(v=>v.filter(x=>x.id!==id))
    if(type==='fiche') setFiches(f=>f.filter(x=>x.id!==id))
    if(type==='quiz')  setQuizzes(q=>q.filter(x=>x.id!==id))
  }

  const deleteStudent=async(id)=>{
    if(!confirm('Supprimer cet élève ?')) return
    await supabase.from('students').delete().eq('id',id)
    setStudents(s=>s.filter(x=>x.id!==id))
    setSelStudent(null)
  }

  const deleteMsg=async(sid,msgId)=>{
    await supabase.from('messages').delete().eq('id',msgId)
    setMsgs(m=>({...m,[sid]:(m[sid]||[]).filter(x=>x.id!==msgId)}))
  }

  const sendReply=async(sid,text,atts)=>{
    const msg={student_id:sid,from_role:'teacher',text,attachments:atts.map(({name,type,size,url})=>({name,type,size,url}))}
    const optimistic={...msg,id:'tmp-'+Date.now(),sent_at:new Date().toISOString()}
    setMsgs(m=>({...m,[sid]:[...(m[sid]||[]),optimistic]}))
    const {data}=await supabase.from('messages').insert(msg).select().single()
    if(data) setMsgs(m=>({...m,[sid]:(m[sid]||[]).map(x=>x.id===optimistic.id?data:x)}))
    // Mark student messages as read
    await supabase.from('messages').update({read_at:new Date().toISOString()}).eq('student_id',sid).eq('from_role','student').is('read_at',null)
    setReadMsgs(r=>({...r,[sid]:new Date().toISOString()}))
    // Broadcast teacher not typing anymore
    const tch=supabase.channel('typing-s-'+sid,{config:{broadcast:{ack:false,self:false}}})
    tch.subscribe(s=>{ if(s==='SUBSCRIBED') tch.send({type:'broadcast',event:'teacher_typing',payload:{typing:false}}) })

  }

  const tog=(arr,id)=>arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]
  const ClsCbs=({value,onChange})=>(
    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
      {classes.map(c=>(
        <div key={c.id} onClick={()=>onChange(tog(value||[],c.id))} style={{background:value?.includes(c.id)?c.color+'33':G.surface,border:`1px solid ${value?.includes(c.id)?c.color:G.border}`,borderRadius:8,padding:'5px 11px',cursor:'pointer',fontSize:12,color:value?.includes(c.id)?c.color:G.muted,transition:'all .14s'}}>
          {c.name}
        </div>
      ))}
    </div>
  )

  const filtered=selClass==='all'?students:students.filter(s=>s.class_id===selClass)
  const avgProg=students.length?Math.round(students.reduce((a,s)=>a+(s.progress||0),0)/students.length):0
  const countUnread=(sid)=>{
    // If never opened this conversation, mark all existing as read (only NEW messages after login count)
    const lastRead=readMsgs[sid]||sessionStart
    return (msgs[sid]||[]).filter(m=>m.from_role==='student'&&new Date(m.sent_at)>new Date(lastRead)).length
  }
  const totalUnread=students.reduce((a,s)=>a+countUnread(s.id),0)
  const tabs=[{id:'dashboard',icon:'📊',label:'Stats'},{id:'students',icon:'👥',label:'Élèves'},{id:'msgs',icon:'💬',label:'Messages'},{id:'content',icon:'📚',label:'Contenu'},{id:'notes',icon:'📝',label:'Notes'},{id:'game',icon:'🎮',label:'Jeu'},{id:'add',icon:'➕',label:'Ajouter'}]

  if(loading) return <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:G.bg}}><Spinner/></div>

  return (
    <div className="app-root">
      {drivePreview&&<DriveViewer url={drivePreview.drive_url} title={drivePreview.title} onBack={()=>setDrivePreview(null)} accent={G.accentHot}/>}
      {showImport&&<ExcelImporter classes={classes} onImport={handleImport} onClose={()=>{setShowImport(false);loadAll()}}/>}

      <div style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:9,flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
        <img src="/logo.jpg" alt="Talis" style={{height:32,width:'auto',borderRadius:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div className="syne" style={{fontWeight:700,fontSize:13}}>Ben · Professeur</div>
          <div style={{fontSize:11,color:G.muted}}>{students.length} élèves · {classes.length} classes</div>
        </div>
        <button onClick={onLogout} style={{background:'none',border:'none',color:G.muted,cursor:'pointer',fontSize:15}} title="Déconnexion">🚪</button>
      </div>

      <div style={{flex:1,position:'relative',minHeight:0,display:'flex',flexDirection:'column'}}>
      <div className="app-scroll" style={{padding:16,flex:1}}>

        {/* DASHBOARD */}
        {tab==='dashboard'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>Vue d'ensemble</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div onClick={()=>setTab('students')} className="hov"><Stat icon="👥" label="Élèves" value={students.length} color={G.accent}/></div>
              <div onClick={()=>setTab('students')} className="hov"><Stat icon="🏫" label="Classes" value={classes.length} color={G.accentCyan}/></div>
              <div onClick={()=>setTab('content')} className="hov"><Stat icon="📈" label="Moy. prog." value={`${avgProg}%`} color={G.accentGreen}/></div>
              <div onClick={()=>setTab('msgs')} className="hov"><Stat icon="💬" label="Msgs non lus" value={totalUnread} color={G.accentHot}/></div>
            </div>
            {classes.map(cl=>{
              const cls=students.filter(s=>s.class_id===cl.id)
              const avg=cls.length?Math.round(cls.reduce((a,s)=>a+(s.progress||0),0)/cls.length):0
              return (
                <div key={cl.id} onClick={()=>{setSelClass(cl.id);setTab('students')}} className="hov" style={{background:G.card,border:`1px solid ${cl.color}33`,borderRadius:13,padding:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:cl.color}}/>
                    <div className="syne" style={{fontWeight:700,fontSize:13,flex:1}}>{cl.name}</div>
                    <Bdg color={cl.color}>{cls.length} élève{cls.length>1?'s':''}</Bdg>
                  </div>
                  <PBar value={avg} color={cl.color}/>
                  <div style={{fontSize:11,color:G.muted,marginTop:4}}>Progression moyenne : {avg}%</div>
                </div>
              )
            })}
          </div>
        )}

        {/* STUDENTS */}
        {tab==='students'&&(
          <div className="fade-up">
            {selStudent?(
              <div>
                <button onClick={()=>setSelStudent(null)} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',marginBottom:12,fontSize:14}}>← Retour</button>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:15,padding:16,marginBottom:11}}>
                  <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:13}}>
                    <Av name={`${selStudent.first_name} ${selStudent.last_name}`} size={46}/>
                    <div>
                      <div className="syne" style={{fontWeight:700,fontSize:16}}>{selStudent.first_name} {selStudent.last_name}</div>
                      <div style={{color:G.muted,fontSize:12}}>{selStudent.email}</div>
                      {selStudent.classes&&<Bdg color={selStudent.classes.color}>{selStudent.classes.name}</Bdg>}
                    </div>
                  </div>
                  <PBar value={selStudent.progress||0} color={G.accentGreen}/>
                  <div style={{marginTop:9,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {[['Progression',`${selStudent.progress||0}%`,G.accentGreen],['Dernière co.',selStudent.last_seen?new Date(selStudent.last_seen).toLocaleDateString('fr-FR'):'Jamais',G.gold],['Mdp changé',selStudent.must_change_password?'Non':'Oui',selStudent.must_change_password?G.accentHot:G.accentGreen]].map(([l,v,c])=>(
                      <div key={l} style={{background:G.surface,borderRadius:8,padding:'8px 9px',textAlign:'center'}}>
                        <div style={{color:G.muted,fontSize:10}}>{l}</div>
                        <div className="syne" style={{fontWeight:700,color:c,fontSize:14}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:7}}>
                  <Btn sm v="ghost" onClick={()=>{setTab('msgs');setSelStudent(selStudent)}}>💬 Envoyer message</Btn>
                  <Btn sm v="danger" onClick={()=>deleteStudent(selStudent.id)}>🗑 Supprimer</Btn>
                </div>
              </div>
            ):(
              <>
                <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:13}}>
                  <div className="syne" style={{fontSize:18,fontWeight:800,flex:1}}>👥 Élèves</div>
                  <Btn sm v="ghost" onClick={()=>setShowImport(true)}>📥 Importer</Btn>
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:11}}>
                  {[{id:'all',name:'Toutes',color:G.muted},...classes].map(c=>(
                    <div key={c.id} onClick={()=>setSelClass(c.id)} style={{padding:'4px 11px',borderRadius:7,background:selClass===c.id?c.color+'33':G.surface,border:`1px solid ${selClass===c.id?c.color:G.border}`,color:selClass===c.id?c.color:G.muted,cursor:'pointer',fontSize:12}}>{c.name}</div>
                  ))}
                </div>
                {!filtered.length&&<div style={{color:G.muted,fontSize:13}}>Aucun élève.</div>}
                {filtered.map(s=>(
                  <div key={s.id} onClick={()=>setSelStudent(s)} className="hov" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                    <Av name={`${s.first_name} ${s.last_name}`} size={40}/>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{fontWeight:600,fontSize:13}}>{s.first_name} {s.last_name}</div>
                        <span style={{fontSize:10,color:presence[s.id]?.is_online?G.accentGreen:G.muted}}>{presence[s.id]?.is_online?'● En ligne':'○ Hors ligne'}</span>
                      </div>
                      <div style={{display:'flex',gap:5,marginTop:2,marginBottom:5,flexWrap:'wrap'}}>
                        {s.classes&&<Bdg color={s.classes.color} sm>{s.classes.name}</Bdg>}
                        {s.must_change_password&&<Bdg color={G.gold} sm>mdp à changer</Bdg>}
                      </div>
                      <PBar value={s.progress||0} color={(s.progress||0)>=70?G.accentGreen:(s.progress||0)>=40?G.gold:G.accentHot} h={5}/>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:(s.progress||0)>=70?G.accentGreen:(s.progress||0)>=40?G.gold:G.accentHot}}>{s.progress||0}%</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* MESSAGES */}
        {tab==='msgs'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {selStudent?(
              <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                <MsgThread
                  msgs={msgs[selStudent.id]||[]}
                  myRole="teacher"
                  onSend={(t,a)=>sendReply(selStudent.id,t,a)}
                  onDelete={(id)=>deleteMsg(selStudent.id,id)}
                  onView={()=>{
                    const now=new Date().toISOString()
                    setReadMsgs(r=>({...r,[selStudent.id]:now}))
                    const sid=selStudent.id
                    // Mark each unread student message individually
                    const unread=(msgs[sid]||[]).filter(m=>m.from_role==='student'&&!m.read_at)
                    unread.forEach(m=>{
                      supabase.from('messages').update({read_at:now}).eq('id',m.id).then(()=>{
                        setMsgs(prev=>({...prev,[sid]:(prev[sid]||[]).map(x=>x.id===m.id?{...x,read_at:now}:x)}))
                      })
                    })
                  }}
                  onBack={()=>setSelStudent(null)}
                  otherName={`${selStudent.first_name} ${selStudent.last_name}`}
                  isTyping={!!studentTyping[selStudent.id]}
                  isOnline={!!presence[selStudent.id]?.is_online}
                  onTyping={(isT)=>{
                    const tch=supabase.channel('typing-s-'+selStudent.id,{config:{broadcast:{ack:false,self:false}}})
                    tch.subscribe(s=>{ if(s==='SUBSCRIBED') tch.send({type:'broadcast',event:'teacher_typing',payload:{typing:isT}}) })
                  }}
                />
              </div>
            ):(
              <>
                <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:12}}>💬 Messages</div>
                {students.filter(s=>(msgs[s.id]||[]).length>0).length===0&&(
                  <div style={{color:G.muted,fontSize:13,textAlign:'center',marginTop:32}}>Aucun message pour le moment.</div>
                )}
                {students.filter(s=>(msgs[s.id]||[]).length>0).sort((a,b)=>{
                  const la=msgs[a.id]||[]; const lb=msgs[b.id]||[]
                  const ta=la[la.length-1]?.sent_at||0; const tb=lb[lb.length-1]?.sent_at||0
                  return new Date(tb)-new Date(ta)
                }).map(s=>{
                  const sm=msgs[s.id]||[]
                  const unread=countUnread(s.id)
                  const last=sm[sm.length-1]
                  return (
                    <div key={s.id} onClick={()=>setSelStudent(s)} className="hov" style={{background:G.card,border:`1px solid ${unread?G.accentHot+'44':G.border}`,borderRadius:12,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                      <Av name={`${s.first_name} ${s.last_name}`} size={38}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{s.first_name} {s.last_name}</div>
                        <div style={{fontSize:12,color:G.muted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{last?last.text||(parseAtts(last.attachments).length>0?`📎 ${parseAtts(last.attachments)[0].name}`:'—'):'—'}</div>
                      </div>
                      {unread>0&&<div style={{width:19,height:19,borderRadius:'50%',background:G.accentHot,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{unread}</div>}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* CONTENT */}
        {tab==='content'&&(
          <div className="fade-up">
            <>
                <div className="syne" style={{fontSize:18,fontWeight:800,marginBottom:13}}>📚 Contenu publié</div>
                {[['🎬 Vidéos',videos,G.accent,'video'],['📄 Fiches',fiches,G.accentCyan,'fiche'],['🧠 Quiz',quizzes,G.gold,'quiz']].map(([label,items,color,type])=>(
                  <div key={type} style={{marginBottom:15}}>
                    <div className="syne" style={{fontWeight:700,marginBottom:7,color,fontSize:13}}>{label} ({items.length})</div>
                    {!items.length&&<div style={{color:G.muted,fontSize:12}}>Aucun contenu.</div>}
                    {items.map(item=>{
                      const itemClasses=(item.classIds||[]).map(cid=>classes.find(c=>c.id===cid)).filter(Boolean)
                      return (
                      <div key={item.id} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:11,padding:'10px 13px',marginBottom:6}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{fontSize:18,flexShrink:0}}>{type==='quiz'?'🧠':type==='video'?item.emoji:'📄'}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title}</div>
                            {type!=='quiz'&&<div style={{fontSize:10,color:item.drive_url?G.accentGreen:G.accentHot,marginTop:2}}>{item.drive_url?'✅ Lien Drive':'⚠️ Pas de lien Drive'}</div>}
                          </div>
                          <div style={{display:'flex',gap:5,flexShrink:0}}>
                            {type!=='quiz'&&item.drive_url&&<button onClick={()=>setDrivePreview(item)} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:13}}>👁</button>}
                            <button onClick={()=>deleteContent(type,item.id)} style={{background:'none',border:'none',color:G.accentHot,cursor:'pointer',fontSize:13}}>🗑</button>
                          </div>
                        </div>
                        {itemClasses.length>0&&(
                          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:7}}>
                            {itemClasses.map(cl=>(
                              <span key={cl.id} style={{background:cl.color+'22',color:cl.color,border:`1px solid ${cl.color}44`,borderRadius:5,padding:'2px 7px',fontSize:10,fontWeight:600}}>{cl.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}

                  </div>
                ))}
            </>
          </div>
        )}

        {/* NOTES */}
        {tab==='notes'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>📝 Notes & Évaluations</div>

            {/* Create new grade */}
            <div style={{background:G.card,border:`1px solid ${G.accentHot}33`,borderRadius:14,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:11,color:G.accentHot,fontSize:13}}>{editingGrade?'✏️ Modifier l’évaluation':'➕ Nouvelle évaluation'}</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Inp placeholder="Intitulé (ex: Contrôle chapitre 3)" value={gradeForm.title} onChange={e=>setGradeForm({...gradeForm,title:e.target.value})}/>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,color:G.muted,flexShrink:0}}>Coefficient :</span>
                  {[0.5,1,2,3,4,5].map(c=>(
                    <div key={c} onClick={()=>setGradeForm({...gradeForm,coefficient:c})} style={{padding:'3px 9px',borderRadius:7,background:gradeForm.coefficient===c?G.accentHot+'33':G.surface,border:`1px solid ${gradeForm.coefficient===c?G.accentHot:G.border}`,color:gradeForm.coefficient===c?G.accentHot:G.muted,cursor:'pointer',fontSize:12}}>{c}</div>
                  ))}
                </div>
                <div style={{fontSize:12,color:G.muted}}>Classes :</div>
                <ClsCbs value={gradeForm.classIds} onChange={v=>setGradeForm({...gradeForm,classIds:v,scores:{}})}/>
                {gradeForm.classIds.length>0&&(
                  <>
                    <div style={{fontSize:12,color:G.muted,marginTop:4}}>Notes des élèves (sur 20) :</div>
                    <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflow:'auto'}}>
                      {students.filter(s=>gradeForm.classIds.includes(s.class_id)).map(s=>(
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,background:G.surface,borderRadius:8,padding:'7px 10px'}}>
                          <Av name={`${s.first_name} ${s.last_name}`} size={26}/>
                          <div style={{flex:1,fontSize:13}}>{s.first_name} {s.last_name}</div>
                          <input
                            type="number" min="0" max="20" step="0.5"
                            placeholder="—"
                            value={gradeForm.scores[s.id]||''}
                            onChange={e=>setGradeForm(f=>({...f,scores:{...f.scores,[s.id]:e.target.value}}))}
                            style={{width:52,background:G.card,border:`1px solid ${G.border}`,borderRadius:7,color:G.text,fontSize:13,padding:'4px 8px',textAlign:'center',outline:'none'}}
                          />
                          <span style={{fontSize:12,color:G.muted}}>/20</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{display:'flex',gap:8}}>
                  <Btn v="hot" onClick={async()=>{
                    if(!gradeForm.title||!gradeForm.classIds.length) return
                    setSaving(true)
                    if(editingGrade){
                      // UPDATE existing grade
                      await supabase.from('grades').update({title:gradeForm.title,coefficient:gradeForm.coefficient}).eq('id',editingGrade)
                      // Upsert scores
                      const scoreRows=Object.entries(gradeForm.scores).filter(([,v])=>v!=='').map(([sid,score])=>({grade_id:editingGrade,student_id:sid,score:parseFloat(score)}))
                      if(scoreRows.length) await supabase.from('grade_scores').upsert(scoreRows,{onConflict:'grade_id,student_id'})
                      // Delete scores set to empty
                      const toDelete=Object.entries(gradeForm.scores).filter(([,v])=>v==='').map(([sid])=>sid)
                      if(toDelete.length) await supabase.from('grade_scores').delete().eq('grade_id',editingGrade).in('student_id',toDelete)
                      setEditingGrade(null)
                      alert('✅ Évaluation mise à jour !')
                    } else {
                      // CREATE new grade
                      const {data:g}=await supabase.from('grades').insert({title:gradeForm.title,coefficient:gradeForm.coefficient}).select().single()
                      if(g){
                        await supabase.from('grade_classes').insert(gradeForm.classIds.map(cid=>({grade_id:g.id,class_id:cid})))
                        const scoreRows=Object.entries(gradeForm.scores).filter(([,v])=>v!=='').map(([sid,score])=>({grade_id:g.id,student_id:sid,score:parseFloat(score)}))
                        if(scoreRows.length) await supabase.from('grade_scores').insert(scoreRows)
                        alert('✅ Évaluation publiée !')
                      }
                    }
                    await loadAll()
                    setGradeForm({title:'',coefficient:1,classIds:[],scores:{}})
                    setSaving(false)
                  }} disabled={!gradeForm.title||!gradeForm.classIds.length} loading={saving}>
                    {editingGrade?'💾 Enregistrer les modifications':'Publier l’évaluation'}
                  </Btn>
                  {editingGrade&&<Btn v="ghost" onClick={()=>{setEditingGrade(null);setGradeForm({title:'',coefficient:1,classIds:[],scores:{}})}}>Annuler</Btn>}
                </div>
              </div>
            </div>

            {/* ── LEVEL 1: global class average ── */}
            {!notesView&&(
              <>
                {grades.length===0&&<div style={{color:G.muted,fontSize:13}}>Aucune évaluation publiée.</div>}
                {grades.length>0&&(()=>{
                  // Compute overall weighted average across all grades
                  const allScored=grades.flatMap(g=>students.filter(s=>g.classIds.includes(s.class_id)&&g.scores[s.id]!==undefined).map(s=>({score:parseFloat(g.scores[s.id]),coeff:g.coefficient})))
                  const totalW=allScored.reduce((a,x)=>a+x.score*x.coeff,0)
                  const totalC=allScored.reduce((a,x)=>a+x.coeff,0)
                  const globalAvg=totalC?Math.round(totalW/totalC*10)/10:null
                  return (
                    <div onClick={()=>setNotesView('list')} className="hov" style={{background:G.card,border:`1px solid ${G.accent}33`,borderRadius:14,padding:18,cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{flex:1}}>
                          <div className="syne" style={{fontWeight:800,fontSize:15}}>Moyenne générale — tous devoirs</div>
                          <div style={{color:G.muted,fontSize:12,marginTop:2}}>{grades.length} évaluation{grades.length>1?'s':''} · Cliquer pour le détail →</div>
                        </div>
                        <div className="syne" style={{fontSize:30,fontWeight:800,color:globalAvg>=10?G.accentGreen:G.accentHot}}>{globalAvg??'—'}/20</div>
                      </div>
                      <div style={{marginTop:10}}><PBar value={globalAvg?(globalAvg/20)*100:0} color={globalAvg>=10?G.accentGreen:G.accentHot}/></div>
                    </div>
                  )
                })()}
              </>
            )}

            {/* ── LEVEL 2: list of grades (avg only, no detail) ── */}
            {notesView==='list'&&(
              <>
                <button onClick={()=>setNotesView(null)} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4}}>← Retour</button>
                <div className="syne" style={{fontWeight:700,fontSize:14,color:G.muted}}>Toutes les évaluations</div>
                {grades.map(g=>{
                  const cls=g.classIds.map(cid=>classes.find(c=>c.id===cid)).filter(Boolean)
                  const concerned=students.filter(s=>g.classIds.includes(s.class_id))
                  const scored=concerned.filter(s=>g.scores[s.id]!==undefined)
                  const avg=scored.length?Math.round(scored.reduce((a,s)=>a+(parseFloat(g.scores[s.id])||0),0)/scored.length*10)/10:null
                  return (
                    <div key={g.id} onClick={()=>setNotesView(g.id)} className="hov" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:13,padding:14,cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14}}>{g.title}</div>
                          <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap'}}>
                            <Bdg color={G.accentHot}>Coeff. {g.coefficient}</Bdg>
                            {cls.map(c=><Bdg key={c.id} color={c.color}>{c.name}</Bdg>)}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div className="syne" style={{fontSize:22,fontWeight:800,color:avg>=10?G.accentGreen:G.accentHot}}>{avg??'—'}/20</div>
                          <div style={{fontSize:10,color:G.muted}}>Moy. classe</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* ── LEVEL 3: grade detail per student ── */}
            {notesView&&notesView!=='list'&&(()=>{
              const g=grades.find(x=>x.id===notesView); if(!g) return null
              const concerned=students.filter(s=>g.classIds.includes(s.class_id))
              const scored=concerned.filter(s=>g.scores[s.id]!==undefined)
              const avg=scored.length?Math.round(scored.reduce((a,s)=>a+(parseFloat(g.scores[s.id])||0),0)/scored.length*10)/10:null
              return (
                <>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>setNotesView('list')} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14}}>← Retour</button>
                    <div className="syne" style={{fontWeight:700,fontSize:15,flex:1}}>{g.title}</div>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>{setEditingGrade(g.id);setGradeForm({title:g.title,coefficient:g.coefficient,classIds:g.classIds,scores:{...g.scores}});setNotesView(null)}} style={{background:'none',border:'none',color:G.accent,cursor:'pointer',fontSize:14}}>✏️</button>
                      <button onClick={async()=>{if(window.confirm('Supprimer ?')){await supabase.from('grades').delete().eq('id',g.id);await loadAll();setNotesView('list')}}} style={{background:'none',border:'none',color:G.accentHot,cursor:'pointer',fontSize:14}}>🗑</button>
                    </div>
                  </div>
                  {avg!==null&&<div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:11,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1,color:G.muted,fontSize:12}}>Moyenne de classe</div>
                    <div className="syne" style={{fontSize:20,fontWeight:800,color:avg>=10?G.accentGreen:G.accentHot}}>{avg}/20</div>
                  </div>}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {concerned.map(s=>{
                      const note=g.scores[s.id]
                      return (
                        <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,background:G.card,border:`1px solid ${G.border}`,borderRadius:10,padding:'10px 14px'}}>
                          <Av name={`${s.first_name} ${s.last_name}`} size={30}/>
                          <div style={{flex:1,fontSize:13,fontWeight:500}}>{s.first_name} {s.last_name}</div>
                          {note!==undefined
                            ?<><div style={{fontSize:14,fontWeight:800,color:parseFloat(note)>=10?G.accentGreen:G.accentHot}}>{note}/20</div>
                              <div style={{width:50}}><PBar value={(parseFloat(note)/20)*100} color={parseFloat(note)>=10?G.accentGreen:G.accentHot} h={4}/></div></>
                            :<div style={{fontSize:12,color:G.muted}}>— Non noté</div>
                          }
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        )}



        {/* ADD */}
        {tab==='add'&&(
          <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>➕ Ajouter</div>

            <div style={{background:G.gold+'14',border:`1px solid ${G.gold}33`,borderRadius:10,padding:12,fontSize:12,color:G.gold,lineHeight:1.65}}>
              💡 <strong>Lien Google Drive</strong> : clic droit sur le fichier → Partager → "Tout le monde avec le lien" → Copier le lien
            </div>

            {/* Nouvelle classe */}
            <div style={{background:G.card,border:`1px solid ${G.accentCyan}33`,borderRadius:15,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:11,color:G.accentCyan,fontSize:13}}>🏫 Nouvelle classe</div>
              <div style={{display:'flex',gap:7}}>
                <Inp value={newClassName} onChange={e=>setNewClassName(e.target.value)} placeholder="Ex: Terminale C" style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&addClass()}/>
                <Btn v="cyan" onClick={addClass}>Créer</Btn>
              </div>
              {classes.length>0&&<div style={{marginTop:9,display:'flex',gap:5,flexWrap:'wrap'}}>{classes.map(c=><Bdg key={c.id} color={c.color}>{c.name}</Bdg>)}</div>}
            </div>

            {/* Import */}
            <div style={{background:G.card,border:`1px solid ${G.accentGreen}33`,borderRadius:15,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:6,color:G.accentGreen,fontSize:13}}>📥 Importer des élèves</div>
              <div style={{color:G.muted,fontSize:12,marginBottom:11}}>Fichier Excel/CSV avec colonnes : Prénom, Nom, Email, Classe. Mot de passe par défaut : <strong style={{color:G.accentGreen}}>talis2024</strong></div>
              <Btn v="green" onClick={()=>setShowImport(true)}>Choisir un fichier Excel</Btn>
            </div>

            {/* Vidéo */}
            <div style={{background:G.card,border:`1px solid ${G.accent}33`,borderRadius:15,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:11,color:G.accent,fontSize:13}}>🎬 Nouvelle vidéo</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Inp placeholder="Titre *" value={form.vTitle||''} onChange={e=>setForm({...form,vTitle:e.target.value})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  <Inp placeholder="Matière" value={form.vSection||''} onChange={e=>setForm({...form,vSection:e.target.value})}/>
                  <Inp placeholder="Durée (12:34)" value={form.vDur||''} onChange={e=>setForm({...form,vDur:e.target.value})}/>
                </div>
                <Inp placeholder="Emoji (🎬)" value={form.vEmoji||''} onChange={e=>setForm({...form,vEmoji:e.target.value})}/>
                <Inp placeholder="🔗 Lien Google Drive" value={form.vUrl||''} onChange={e=>setForm({...form,vUrl:e.target.value})}/>
                <div style={{fontSize:12,color:G.muted}}>Classes :</div>
                <ClsCbs value={form.vClassIds||[]} onChange={v=>setForm({...form,vClassIds:v})}/>
                <Btn onClick={addVideo} disabled={!form.vTitle||!form.vClassIds?.length} loading={saving}>Publier la vidéo</Btn>
              </div>
            </div>

            {/* Fiche */}
            <div style={{background:G.card,border:`1px solid ${G.accentCyan}33`,borderRadius:15,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:11,color:G.accentCyan,fontSize:13}}>📄 Nouvelle fiche</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Inp placeholder="Titre *" value={form.fTitle||''} onChange={e=>setForm({...form,fTitle:e.target.value})}/>
                <Inp placeholder="Matière" value={form.fSection||''} onChange={e=>setForm({...form,fSection:e.target.value})}/>
                <Inp placeholder="🔗 Lien Google Drive" value={form.fUrl||''} onChange={e=>setForm({...form,fUrl:e.target.value})}/>
                <div style={{fontSize:12,color:G.muted}}>Classes :</div>
                <ClsCbs value={form.fClassIds||[]} onChange={v=>setForm({...form,fClassIds:v})}/>
                <Btn v="cyan" onClick={addFiche} disabled={!form.fTitle||!form.fClassIds?.length} loading={saving}>Publier la fiche</Btn>
              </div>
            </div>

            {/* Quiz */}
            <div style={{background:G.card,border:`1px solid ${G.gold}33`,borderRadius:15,padding:16}}>
              <div className="syne" style={{fontWeight:700,marginBottom:11,color:G.gold,fontSize:13}}>🧠 Créer un quiz</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Inp placeholder="Titre *" value={quiz.title} onChange={e=>setQuiz({...quiz,title:e.target.value})}/>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:12,color:G.muted}}>Seuil :</span>
                  {[60,70,80,90,100].map(p=>(
                    <div key={p} onClick={()=>setQuiz({...quiz,passScore:p})} style={{padding:'3px 9px',borderRadius:7,background:quiz.passScore===p?G.gold+'33':G.surface,border:`1px solid ${quiz.passScore===p?G.gold:G.border}`,color:quiz.passScore===p?G.gold:G.muted,cursor:'pointer',fontSize:12}}>{p}%</div>
                  ))}
                </div>
                <div style={{fontSize:12,color:G.muted}}>Classes :</div>
                <ClsCbs value={quiz.classIds} onChange={v=>setQuiz({...quiz,classIds:v})}/>

                {/* Import Excel */}
                <QuizExcelImporter onImport={qs=>setQuiz({...quiz,questions:qs})} currentCount={quiz.questions.filter(q=>q.q).length}/>

                {quiz.questions.map((q,qi)=>(
                  <div key={qi} style={{background:G.surface,borderRadius:10,padding:12}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                      <div style={{color:G.muted,fontSize:11}}>Question {qi+1}</div>
                      {quiz.questions.length>1&&<button onClick={()=>setQuiz({...quiz,questions:quiz.questions.filter((_,i)=>i!==qi)})} style={{background:'none',border:'none',color:G.accentHot,cursor:'pointer',fontSize:12}}>🗑</button>}
                    </div>
                    <Inp placeholder="Énoncé" value={q.q} onChange={e=>{const qs=[...quiz.questions];qs[qi].q=e.target.value;setQuiz({...quiz,questions:qs})}}/>
                    <div style={{marginTop:7,display:'flex',flexDirection:'column',gap:5}}>
                      {q.choices.map((c,ci)=>(
                        <div key={ci} style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input type="radio" checked={q.answer===ci} onChange={()=>{const qs=[...quiz.questions];qs[qi].answer=ci;setQuiz({...quiz,questions:qs})}} style={{accentColor:G.accentGreen}}/>
                          <Inp placeholder={`Choix ${['A','B','C','D'][ci]}`} value={c} onChange={e=>{const qs=[...quiz.questions];qs[qi].choices[ci]=e.target.value;setQuiz({...quiz,questions:qs})}} style={{flex:1}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:G.accentGreen,marginTop:4}}>● = bonne réponse</div>
                  </div>
                ))}
                <div style={{display:'flex',gap:7}}>
                  <Btn v="ghost" sm onClick={()=>setQuiz({...quiz,questions:[...quiz.questions,{q:'',choices:['','','',''],answer:0}]})}>+ Question</Btn>
                  <Btn v="green" onClick={addQuiz} disabled={!quiz.title||!quiz.classIds.length} loading={saving}>Publier le quiz</Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {tab==='game'&&!gameActive&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:G.bg,display:'flex',flexDirection:'column',overflow:'auto'}}>
          <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
            <div className="syne" style={{fontSize:18,fontWeight:800}}>🎮 Jeux pédagogiques NDRC</div>
            {/* Game 1: available */}
            <div onClick={()=>setGameActive(true)} className="hov" style={{background:G.card,border:`1px solid ${G.accent}33`,borderRadius:14,padding:18,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${G.accent},#8B7FFF)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏙️</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15}}>La quête du référencement</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Stratégie commerciale · Distributeur 3D</div>
                </div>
                <div style={{background:G.accentGreen+'22',color:G.accentGreen,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>▶ Jouer</div>
              </div>
            </div>
            {/* Game 2: coming soon */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,opacity:.6}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:G.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15,color:G.muted}}>Jeu 2</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Bientôt disponible</div>
                </div>
                <div style={{background:G.border,color:G.muted,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>À venir</div>
              </div>
            </div>
            {/* Game 3: coming soon */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,opacity:.6}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,background:G.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🔒</div>
                <div style={{flex:1}}>
                  <div className="syne" style={{fontWeight:700,fontSize:15,color:G.muted}}>Jeu 3</div>
                  <div style={{color:G.muted,fontSize:12,marginTop:2}}>Bientôt disponible</div>
                </div>
                <div style={{background:G.border,color:G.muted,borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:700}}>À venir</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab==='game'&&gameActive&&(
        <div style={{position:'absolute',inset:0,zIndex:10,background:'#0a0a1a',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(0,0,0,.5)',flexShrink:0}}>
            <button onClick={()=>setGameActive(false)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:4}}>← Quitter</button>
            <div style={{color:'#fff',fontSize:13,fontWeight:600}}>La quête du référencement</div>
          </div>
          <iframe src="/game.html" style={{flex:1,width:'100%',border:'none',display:'block'}} title="Jeu"/>
        </div>
      )}
      </div>
      <div className="app-nav" style={{display:'flex',background:G.surface,borderTop:`1px solid ${G.border}`,padding:'8px 2px 10px'}}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>{setTab(t.id);setSelStudent(null);setDrivePreview(null);if(t.id!=='notes') setNotesView(null);if(t.id!=='game') setGameActive(false)}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer',position:'relative'}}>
            <div style={{fontSize:18,filter:tab===t.id?'none':'grayscale(1) opacity(.4)',transition:'filter .16s'}}>{t.icon}</div>
            <div style={{fontSize:9,color:tab===t.id?G.accentHot:G.muted,fontWeight:tab===t.id?600:400}}>{t.label}</div>
            {t.id==='msgs'&&totalUnread>0&&<div style={{position:'absolute',top:0,right:'16%',width:7,height:7,borderRadius:'50%',background:G.accentHot}}/>}
            {tab===t.id&&<div style={{position:'absolute',bottom:-9,width:16,height:2,background:G.accentHot,borderRadius:2}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail]=useState('')
  const [pwd,setPwd]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)

  const submit=async()=>{
    if(!email||!pwd) return
    setLoading(true); setErr('')
    // Teacher login
    if((email==='ben'||email==='Ben'||email==='ben@talis.fr')&&pwd==='181015'){
      onLogin({role:'teacher'}); return
    }
    // Student login
    const {data,error}=await supabase.from('students').select('*').eq('email',email.toLowerCase()).eq('password_hash',pwd).single()
    if(data){
      await supabase.from('students').update({last_seen:new Date().toISOString()}).eq('id',data.id)
      onLogin({role:'student',student:data})
    } else {
      setErr('Email ou mot de passe incorrect.')
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:G.bg,padding:'max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',overflow:'auto'}}>
      <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:`radial-gradient(circle,${G.accent}18,transparent)`,top:-120,right:-100}}/>
      <div style={{position:'absolute',width:300,height:300,borderRadius:'50%',background:`radial-gradient(circle,${G.accentHot}18,transparent)`,bottom:0,left:-80}}/>
      <div style={{zIndex:1,width:'100%',maxWidth:360}} className="fade-up">
        <div style={{textAlign:'center',marginBottom:36}}>
          <img src="/logo.jpg" alt="Talis Business School" style={{width:160,height:'auto',marginBottom:16,borderRadius:8}}/>
          <div style={{color:G.muted,fontSize:13,marginTop:3}}>Benoit Resche</div>
        </div>
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:20,padding:24,display:'flex',flexDirection:'column',gap:11}}>
          <Inp placeholder="Email" value={email} onChange={e=>{setEmail(e.target.value);setErr('')}}/>
          <Inp placeholder="Mot de passe" type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          {err&&<div style={{color:G.accentHot,fontSize:13,textAlign:'center'}}>{err}</div>}
          <Btn onClick={submit} full loading={loading}>Se connecter</Btn>
        </div>

      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null)

  return (
    <div className="app-root">
      <style>{css}</style>
      {!session?(
        <LoginScreen onLogin={setSession}/>
      ):session.role==='teacher'?(
        <TeacherApp onLogout={()=>setSession(null)}/>
      ):(
        <StudentApp
              student={session.student}
              onLogout={()=>setSession(null)}
              onPwdSaved={newPwd=>setSession(s=>({...s,student:{...s.student,password_hash:newPwd,must_change_password:false}}))}
            />
      )}
    </div>
  )
}
