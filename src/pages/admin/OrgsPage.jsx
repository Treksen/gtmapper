import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search, ChevronRight, X, Check, Globe, Trash2 } from 'lucide-react'
import { useOrganisations, useToast } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ToastContainer } from '../../components/Toast'
import { formatDistanceToNow } from 'date-fns'

export default function OrgsPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { orgs, loading, refetch } = useOrganisations()
  const { toasts, toast } = useToast()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', country:'Kenya', description:'' })
  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

  async function createOrg() {
    if (!form.name.trim()) return toast('Name required','error')
    setSaving(true)
    try {
      const slug = form.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      const { error } = await supabase.from('organisations').insert({ ...form, name:form.name.trim(), slug, status:'active', created_by:profile.id })
      if (error) throw error
      await supabase.from('audit_log').insert({ actor_id:profile.id, actor_role:'super_admin', event_type:'org_created', target_table:'organisations', details:{name:form.name} })
      toast('Organisation created'); setAdding(false); setForm({ name:'',country:'Kenya',description:'' }); refetch()
    } catch(e){ toast(e.message,'error') } finally { setSaving(false) }
  }

  async function toggleStatus(org) {
    const s = org.status==='active'?'suspended':'active'
    await supabase.from('organisations').update({status:s}).eq('id',org.id)
    toast(`Organisation ${s}`); refetch()
  }

  async function deleteOrg(org) {
    if (!confirm(`Delete "${org.name}"?`)) return
    await supabase.from('organisations').delete().eq('id',org.id)
    toast('Deleted'); refetch()
  }

  return (
    <div className="page fade-in">
      <ToastContainer toasts={toasts}/>
      <div className="page-header" style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div><div className="page-title">Organisations</div><div className="page-subtitle">{orgs.length} registered</div></div>
        {!adding && <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}><Plus size={14}/> New Org</button>}
      </div>
      <div className="page-body">
        {adding && (
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:700,fontSize:15,marginBottom:16 }}>New Organisation</div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nairobi Health Initiative"/></div>
                <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description"/></div>
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn btn-primary btn-sm" onClick={createOrg} disabled={saving}>{saving?<span className="spinner"/>:<><Check size={14}/> Create</>}</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}><X size={14}/> Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ position:'relative' }}>
          <Search size={16} style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'var(--n400)' }}/>
          <input className="form-input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:40 }}/>
        </div>
        {loading ? <div style={{ textAlign:'center',padding:40 }}><div className="spinner spinner-dark" style={{ width:28,height:28,margin:'0 auto' }}/></div>
        : <div className="card" style={{ overflow:'hidden' }}>
          {filtered.length===0 ? <div className="empty-state"><Building2 size={40} className="empty-icon"/><div className="empty-title">No organisations</div></div>
          : filtered.map((org,i) => (
            <div key={org.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<filtered.length-1?'1px solid var(--n100)':'none' }}>
              <div className="avatar" style={{ width:42,height:42,fontSize:14,background:'var(--g50)',color:'var(--g800)',cursor:'pointer' }} onClick={()=>nav(`/organisations/${org.id}`)}>{org.name.slice(0,2).toUpperCase()}</div>
              <div style={{ flex:1,cursor:'pointer' }} onClick={()=>nav(`/organisations/${org.id}`)}>
                <div style={{ fontWeight:700,fontSize:14,color:'var(--n900)' }}>{org.name}</div>
                <div style={{ fontSize:12,color:'var(--n500)',display:'flex',alignItems:'center',gap:4 }}><Globe size={11}/> {org.country} · {formatDistanceToNow(new Date(org.created_at),{addSuffix:true})}</div>
              </div>
              <span style={{ fontSize:11,padding:'3px 10px',borderRadius:99,background:org.status==='active'?'var(--g50)':'#fef2f2',color:org.status==='active'?'var(--g800)':'var(--red)',fontWeight:600,flexShrink:0 }}>{org.status||'active'}</span>
              <div style={{ display:'flex',gap:6 }}>
                <button className={`btn btn-sm ${org.status==='active'?'btn-ghost':'btn-secondary'}`} onClick={()=>toggleStatus(org)} style={{ fontSize:12 }}>{org.status==='active'?'Suspend':'Activate'}</button>
                <button className="btn btn-danger btn-sm" onClick={()=>deleteOrg(org)}><Trash2 size={13}/></button>
              </div>
              <ChevronRight size={14} color="var(--n300)" style={{ cursor:'pointer' }} onClick={()=>nav(`/organisations/${org.id}`)}/>
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}
