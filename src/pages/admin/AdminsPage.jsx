import React, { useState, useEffect } from 'react'
import { ShieldCheck, UserPlus, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'
import { format } from 'date-fns'

export default function AdminsPage() {
  const { profile } = useAuth(); const { toasts, toast } = useToast()
  const [admins,setAdmins]=useState([]); const [loading,setLoading]=useState(true)
  const [adding,setAdding]=useState(false); const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({email:'',full_name:'',password:''})

  async function loadAdmins(){ const {data}=await supabase.from('profiles').select('*').eq('role','super_admin').order('created_at'); setAdmins(data||[]); setLoading(false) }
  useEffect(()=>{ loadAdmins() },[])

  async function addAdmin(){
    if(admins.length>=3) return toast('Maximum 3 Super Admins allowed','error')
    if(!form.email||!form.full_name||!form.password) return toast('All fields required','error')
    setSaving(true)
    try {
      const {data:rpcData, error}=await supabase.rpc('create_platform_user',{
        p_email:     form.email,
        p_password:  form.password,
        p_full_name: form.full_name,
        p_role:      'super_admin',
        p_org_id:    null
      })
      if(error) throw error
      toast('Admin created'); setAdding(false); setForm({email:'',full_name:'',password:''}); loadAdmins()
    } catch(e){ toast(e.message,'error') } finally { setSaving(false) }
  }

  async function removeAdmin(admin){
    if(admin.id===profile.id) return toast('Cannot remove yourself','error')
    if(!confirm(`Remove ${admin.full_name}?`)) return
    await supabase.from('profiles').update({role:'supervisor'}).eq('id',admin.id)
    toast('Admin removed'); loadAdmins()
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts}/>
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div className="page-title">Admin Roster</div><div className="page-subtitle">{admins.length}/3 seats filled</div></div>
        {!adding&&admins.length<3&&<button className="btn btn-primary btn-sm" onClick={()=>setAdding(true)}><UserPlus size={14}/> Add Admin</button>}
      </div>
      <div className="page-body">
        <div className={`info-box ${admins.length>=3?'info-box-amber':'info-box-green'}`} style={{display:'flex',gap:10,alignItems:'center'}}>
          <ShieldCheck size={16} style={{flexShrink:0}}/>
          <span>{admins.length>=3?'All 3 Super Admin seats are filled.':`${3-admins.length} seat${3-admins.length>1?'s':''} available. Super Admins approve all actions across all organisations.`}</span>
        </div>
        {adding&&(
          <div className="card" style={{padding:18}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>New Super Admin</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Jane Doe"/></div>
                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="admin@gtmapper.com"/></div>
              </div>
              <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters"/></div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary btn-sm" onClick={addAdmin} disabled={saving}>{saving?<span className="spinner"/>:<><Check size={14}/> Create</>}</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}><X size={14}/> Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[0,1,2].map(i=>{
            const admin=admins[i]
            return (
              <div key={i} className="card" style={{padding:18,borderTop:`3px solid ${admin?'var(--g600)':'var(--n200)'}`}}>
                {admin?(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div className="avatar" style={{width:44,height:44,fontSize:15}}>{admin.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                      {admin.id!==profile.id&&<button className="btn btn-danger btn-sm" onClick={()=>removeAdmin(admin)} title="Remove"><X size={13}/></button>}
                    </div>
                    <div style={{fontWeight:700,fontSize:14,color:'var(--n900)'}}>{admin.full_name}</div>
                    <div style={{fontSize:12,color:admin.is_online?'var(--g700)':'var(--n400)',marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                      {admin.is_online&&<div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80'}}/>}
                      {admin.is_online?'Online':'Offline'}
                    </div>
                    <div style={{fontSize:11,color:'var(--n400)',marginTop:4}}>Joined {format(new Date(admin.created_at),'d MMM yyyy')}</div>
                    {admin.id===profile.id&&<div style={{fontSize:11,color:'var(--g700)',marginTop:4,fontWeight:600}}>You</div>}
                  </>
                ):(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:100,gap:8}}>
                    <div style={{width:44,height:44,borderRadius:'50%',border:'2px dashed var(--n300)',display:'flex',alignItems:'center',justifyContent:'center'}}><UserPlus size={18} color="var(--n400)"/></div>
                    <div style={{fontSize:12,color:'var(--n400)'}}>Seat available</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
