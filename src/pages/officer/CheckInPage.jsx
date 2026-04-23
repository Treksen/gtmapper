import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, CheckCircle, Loader, Navigation, PlusCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { submitVisit, updateOfficerLocation } from '../../hooks/useData'
import { useToast } from '../../hooks/useData'
import { ToastContainer } from '../../components/Toast'

const BENEFICIARY_TYPES = ['Pregnant mother','Child under 5','Postnatal mother','TB patient','HIV patient','Malaria patient','Hypertension patient','Diabetic patient','Malnourished child','Elderly','General community member']
const VISIT_PURPOSES    = ['Antenatal visit','Postnatal check','Vaccination','Medication adherence','Nutrition assessment','Health education','Referral follow-up','Defaulter tracing','Community mobilisation','Home-based care','Disease surveillance']
const OUTCOMES          = ['Completed','No show','Referred','Follow-up needed']
const CONDITIONS        = ['None','Pregnancy complication','Malnutrition','Hypertension','Diabetes','TB','HIV','Malaria','Other']

const STEPS = ['location','details','health','confirm','done']

export default function CheckInPage() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const { toasts, toast } = useToast()
  const [step, setStep]       = useState('location')
  const [gpsLoading, setGps]  = useState(false)
  const [gpsReady,   setReady]= useState(false)
  const [submitting, setSub]  = useState(false)
  const [form, setForm] = useState({
    lat: null, lng: null, gps_accuracy: null, location_name: '',
    beneficiary_type: '', visit_purpose: '', outcome: '',
    household_name: '', household_id: '', beneficiary_age: '',
    beneficiary_sex: '', duration_minutes: '',
    health_condition: '', medications: '', next_visit_date: '',
    referred_to: '', notes: '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function captureGPS() {
    setGps(true)
    if (!navigator.geolocation) {
      // Fallback for dev/testing
      setTimeout(() => {
        set('lat',  -1.3118 + (Math.random()-0.5)*0.004)
        set('lng',   36.791 + (Math.random()-0.5)*0.004)
        set('gps_accuracy', Math.floor(Math.random()*8)+3)
        setGps(false); setReady(true)
      }, 1600)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude)
        set('lng', pos.coords.longitude)
        set('gps_accuracy', Math.round(pos.coords.accuracy))
        setGps(false); setReady(true)
        // Also update live location in DB
        updateOfficerLocation(profile.id, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
      },
      err => {
        setGps(false)
        toast('GPS error: ' + err.message, 'error')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  function canNext() {
    if (step === 'location') return gpsReady
    if (step === 'details')  return form.beneficiary_type && form.visit_purpose && form.outcome
    return true
  }

  function next() { setStep(STEPS[STEPS.indexOf(step)+1]) }
  function back() { setStep(STEPS[STEPS.indexOf(step)-1]) }

  async function handleSubmit() {
    setSub(true)
    try {
      await submitVisit({
        lat: form.lat, lng: form.lng,
        gps_accuracy:    form.gps_accuracy,
        location_name:   form.location_name,
        beneficiary_type: form.beneficiary_type,
        visit_purpose:   form.visit_purpose,
        outcome:         form.outcome,
        household_name:  form.household_name || null,
        household_id:    form.household_id   || null,
        beneficiary_age: form.beneficiary_age ? Number(form.beneficiary_age) : null,
        beneficiary_sex: form.beneficiary_sex || null,
        duration_minutes:form.duration_minutes ? Number(form.duration_minutes) : null,
        health_condition:form.health_condition || null,
        medications:     form.medications     || null,
        next_visit_date: form.next_visit_date  || null,
        referred_to:     form.referred_to     || null,
        notes:           form.notes           || null,
      }, profile)
      setStep('done')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSub(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div style={{ padding: '18px 16px', maxWidth: 500, margin: '0 auto' }} className="fade-in">
      <ToastContainer toasts={toasts}/>

      {step !== 'done' && (
        <>
          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
            {['location','details','health','confirm'].map((s, i) => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: stepIndex > i ? 'var(--g600)' : step === s ? 'var(--g800)' : 'var(--n200)', transition: 'all 0.3s' }}/>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--n400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Step {stepIndex + 1} of 4
          </div>
        </>
      )}

      {/* ── STEP 1: LOCATION ── */}
      {step === 'location' && (
        <div className="slide-up">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Capture location</h2>
          <p style={{ fontSize: 14, color: 'var(--n500)', marginBottom: 22 }}>GPS coordinates will be recorded for this visit.</p>

          <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', background: gpsReady ? 'var(--g50)' : gpsLoading ? '#eff6ff' : 'var(--n100)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${gpsReady ? 'var(--g200)' : gpsLoading ? '#bfdbfe' : 'var(--n200)'}`, transition: 'all 0.3s' }}>
              {gpsLoading
                ? <Loader size={32} color="var(--blue)" style={{ animation: 'spin 1s linear infinite' }}/>
                : gpsReady
                  ? <CheckCircle size={32} color="var(--g600)"/>
                  : <Navigation size={32} color="var(--n400)"/>
              }
            </div>
            {gpsReady ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g700)', marginBottom: 6 }}>Location captured</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--n600)', marginBottom: 4 }}>{form.lat?.toFixed(5)}, {form.lng?.toFixed(5)}</div>
                <div style={{ fontSize: 12, color: 'var(--n400)' }}>Accuracy: ±{form.gps_accuracy}m</div>
                <button onClick={() => { setReady(false) }} style={{ background: 'none', border: 'none', color: 'var(--n400)', fontSize: 12, cursor: 'pointer', marginTop: 12, fontFamily: 'var(--font)' }}>Retake</button>
              </>
            ) : gpsLoading ? (
              <div style={{ fontSize: 14, color: 'var(--n600)' }}>Acquiring GPS signal...</div>
            ) : (
              <>
                <div style={{ fontSize: 14, color: 'var(--n500)', marginBottom: 16 }}>Tap below to record your GPS location</div>
                <button className="btn btn-primary" onClick={captureGPS} style={{ width: '100%' }}><Navigation size={16}/> Capture Location</button>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Location name / landmark (optional)</label>
            <input className="form-input" placeholder="e.g. Near the mango tree, Plot 14" value={form.location_name} onChange={e => set('location_name', e.target.value)}/>
          </div>
        </div>
      )}

      {/* ── STEP 2: VISIT DETAILS ── */}
      {step === 'details' && (
        <div className="slide-up">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Visit details</h2>
          <p style={{ fontSize: 14, color: 'var(--n500)', marginBottom: 22 }}>Record what happened during this visit.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Household name</label>
                <input className="form-input" placeholder="Family name" value={form.household_name} onChange={e => set('household_name', e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Household ID</label>
                <input className="form-input" placeholder="e.g. HH-001" value={form.household_id} onChange={e => set('household_id', e.target.value)}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Beneficiary type *</label>
              <select className="form-select" value={form.beneficiary_type} onChange={e => set('beneficiary_type', e.target.value)}>
                <option value="">Select beneficiary type...</option>
                {BENEFICIARY_TYPES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-input" type="number" min="0" max="120" placeholder="Years" value={form.beneficiary_age} onChange={e => set('beneficiary_age', e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Sex</label>
                <select className="form-select" value={form.beneficiary_sex} onChange={e => set('beneficiary_sex', e.target.value)}>
                  <option value="">Select...</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Visit purpose *</label>
              <select className="form-select" value={form.visit_purpose} onChange={e => set('visit_purpose', e.target.value)}>
                <option value="">Select purpose...</option>
                {VISIT_PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Outcome *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {OUTCOMES.map(o => (
                  <label key={o} className={`radio-option${form.outcome===o?' selected':''}`}>
                    <input type="radio" name="outcome" value={o} checked={form.outcome===o} onChange={() => set('outcome', o)} style={{ accentColor: 'var(--g600)' }}/>
                    <span style={{ fontSize: 14, fontWeight: form.outcome===o?600:400 }}>{o}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input className="form-input" type="number" min="1" max="180" placeholder="e.g. 25" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: HEALTH DETAILS ── */}
      {step === 'health' && (
        <div className="slide-up">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Health information</h2>
          <p style={{ fontSize: 14, color: 'var(--n500)', marginBottom: 22 }}>Optional clinical details for the record.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Health condition</label>
              <select className="form-select" value={form.health_condition} onChange={e => set('health_condition', e.target.value)}>
                <option value="">Select condition...</option>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current medications</label>
              <input className="form-input" placeholder="e.g. Ferrous sulphate, Folic acid" value={form.medications} onChange={e => set('medications', e.target.value)}/>
            </div>
            {(form.outcome === 'Referred' || form.outcome === 'Follow-up needed') && (
              <div className="form-group">
                <label className="form-label">Referred to</label>
                <input className="form-input" placeholder="e.g. Mbagathi Hospital, Dr. Kamau" value={form.referred_to} onChange={e => set('referred_to', e.target.value)}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Next visit date</label>
              <input type="date" className="form-input" value={form.next_visit_date} onChange={e => set('next_visit_date', e.target.value)} min={new Date().toISOString().split('T')[0]}/>
            </div>
            <div className="form-group">
              <label className="form-label">Clinical notes</label>
              <textarea className="form-textarea" placeholder="Observations, findings, follow-up actions..." value={form.notes} onChange={e => set('notes', e.target.value)}/>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: CONFIRM ── */}
      {step === 'confirm' && (
        <div className="slide-up">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Confirm & submit</h2>
          <p style={{ fontSize: 14, color: 'var(--n500)', marginBottom: 22 }}>Review before saving to the database.</p>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
            {[
              { label: 'GPS',         value: `${form.lat?.toFixed(5)}, ${form.lng?.toFixed(5)} (±${form.gps_accuracy}m)`, mono: true },
              { label: 'Household',   value: form.household_name || '—' },
              { label: 'Beneficiary', value: `${form.beneficiary_type}${form.beneficiary_age?', '+form.beneficiary_age+' yrs':''}${form.beneficiary_sex?' ('+form.beneficiary_sex+')':''}` },
              { label: 'Purpose',     value: form.visit_purpose },
              { label: 'Outcome',     value: form.outcome },
              { label: 'Duration',    value: form.duration_minutes ? `${form.duration_minutes} min` : '—' },
              { label: 'Condition',   value: form.health_condition || '—' },
              { label: 'Referred to', value: form.referred_to || '—' },
              { label: 'Next visit',  value: form.next_visit_date || '—' },
              { label: 'Officer',     value: profile?.full_name },
              { label: 'Zone',        value: profile?.zones?.name || '—' },
            ].map(({ label, value, mono }, i, arr) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 16px', borderBottom: i < arr.length-1 ? '1px solid var(--n100)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--n500)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--n800)', fontWeight: 500, textAlign: 'right', fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</span>
              </div>
            ))}
          </div>
          {form.notes && (
            <div style={{ background: 'var(--n50)', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid var(--n200)' }}>
              <div style={{ fontSize: 10, color: 'var(--n400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--n700)', lineHeight: 1.55 }}>{form.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <div className="slide-up" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'var(--g50)', border: '3px solid var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={46} color="var(--g600)"/>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--n900)', marginBottom: 8 }}>Visit saved!</h2>
          <p style={{ fontSize: 15, color: 'var(--n500)', marginBottom: 8 }}>Your visit has been saved to the database and is now visible to your supervisor.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--g50)', color: 'var(--g700)', padding: '6px 14px', borderRadius: 99, fontSize: 13, marginBottom: 32, fontFamily: 'var(--mono)' }}>
            <MapPin size={13}/> {form.lat?.toFixed(4)}, {form.lng?.toFixed(4)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary btn-full" style={{ padding: 14, fontSize: 15 }}
              onClick={() => { setStep('location'); setReady(false); setForm({ lat:null,lng:null,gps_accuracy:null,location_name:'',beneficiary_type:'',visit_purpose:'',outcome:'',household_name:'',household_id:'',beneficiary_age:'',beneficiary_sex:'',duration_minutes:'',health_condition:'',medications:'',next_visit_date:'',referred_to:'',notes:'' }) }}>
              <PlusCircle size={18}/> Record another visit
            </button>
            <button className="btn btn-ghost btn-full" style={{ padding: 14, fontSize: 15 }} onClick={() => nav('/')}>Back to home</button>
          </div>
        </div>
      )}

      {/* Nav buttons */}
      {step !== 'done' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {stepIndex > 0 && (
            <button className="btn btn-ghost" onClick={back} style={{ flex: 1, padding: 14 }}>Back</button>
          )}
          {step !== 'confirm' ? (
            <button className="btn btn-primary" onClick={next} disabled={!canNext()} style={{ flex: 2, padding: 14, fontSize: 15, opacity: canNext()?1:0.5 }}>Continue</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: 14, fontSize: 15 }}>
              {submitting ? <span className="spinner"/> : <><CheckCircle size={17}/> Submit visit</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
