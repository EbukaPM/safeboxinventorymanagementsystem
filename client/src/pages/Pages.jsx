// pages/index.js — barrel export for all pages
export { default as Dashboard } from './Dashboard';
export { default as Login } from './Login';

// Inventory
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, Modal, FormRow, Input, Select, Grid2, DataTable, Badge, StatusBadge, Alert, fmt, fmtN, Progress } from '../components/ui';
import api from '../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0,10);
const useFetch = (path, deps=[]) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); api.get(path).then(d=>{ setData(d); setLoading(false); }).catch(()=>setLoading(false)); };
  useEffect(reload, deps);
  return [data, loading, reload];
};

// ── Inventory Page ─────────────────────────────────────────────────────────
export function Inventory() {
  const { isSA } = useAuth();
  const [products, loading, reload] = useFetch('/products');
  const [stock] = useFetch('/products/stock');
  const [cats] = useFetch('/categories');
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [subs, setSubs] = useState([]);
  const sf = v => setForm(f=>({...f,...v}));

  const stockMap = Object.fromEntries(stock.map(s=>[s.id,s.current_stock]));

  const openAdd = () => { const c=cats[0]; setForm({category:c?.name||'',subcategory:'',brand:'',model:'',unit:'Unit',min_threshold:0,max_threshold:100,unit_cost:0}); setSubs(c?.subs?.map(s=>s.name)||[]); setEditing(null); setModal(true); };
  const openEdit = p => { setForm({...p}); setSubs(cats.find(c=>c.name===p.category)?.subs?.map(s=>s.name)||[]); setEditing(p.id); setModal(true); };
  const onCatChange = v => { sf({category:v,subcategory:''}); setSubs(cats.find(c=>c.name===v)?.subs?.map(s=>s.name)||[]); };
  const save = async () => {
    try { editing ? await api.put(`/products/${editing}`, form) : await api.post('/products', form); setModal(false); reload(); }
    catch (e) { alert(e.message); }
  };

  const filtered = products.filter(p=>(!catFilter||p.category===catFilter)&&(!search||p.model.toLowerCase().includes(search.toLowerCase())||p.brand?.toLowerCase().includes(search.toLowerCase())));

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Product catalogue</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>All warehouse products & thresholds</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true" />Add product</Btn>
    </div>
    {!isSA() && <Alert type="warning"><i className="ti ti-info-circle" aria-hidden="true" />New products require Super Admin approval before appearing in stock calculations</Alert>}
    <div style={{ display:'flex',gap:8,marginBottom:12 }}>
      <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ padding:'5px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,background:'var(--color-background-primary)',color:'var(--color-text-primary)' }}>
        <option value="">All categories</option>
        {cats.map(c=><option key={c.id}>{c.name}</option>)}
      </select>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search model or brand…" style={{ padding:'5px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,width:200 }} />
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'brand',label:'Brand',width:90},{key:'model',label:'Model',wrap:true},
          {key:'category',label:'Category',width:110,render:r=><Badge color="gray">{r.category}</Badge>},
          {key:'stock',label:'Stock',width:90,align:'right',render:r=>{ const s=stockMap[r.id]??'—'; return <strong style={{color:s<=r.min_threshold?'#A32D2D':s<=r.min_threshold*1.2?'#BA7517':'inherit'}}>{fmtN(s)}</strong>; }},
          {key:'status',label:'Approval',width:100,render:r=><StatusBadge status={r.status}/>},
          {key:'level',label:'Level',width:80,render:r=>{ const s=stockMap[r.id]||0; return <Progress value={s} max={r.max_threshold} color={s<=r.min_threshold?'#A32D2D':s<=r.min_threshold*1.2?'#BA7517':'#0F6E56'}/>; }},
          {key:'unit_cost',label:'Unit cost',width:110,align:'right',render:r=>fmt(r.unit_cost)},
          {key:'value',label:'Total value',width:120,align:'right',render:r=>fmt((stockMap[r.id]||0)*r.unit_cost)},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={filtered} empty="No products found"
      />
    </Card>
    <Modal open={modal} title={editing?'Edit product':'Add product'} onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Category"><Select value={form.category||''} onChange={onCatChange}>{cats.map(c=><option key={c.id}>{c.name}</option>)}</Select></FormRow>
        <FormRow label="Sub-category"><Select value={form.subcategory||''} onChange={v=>sf({subcategory:v})}>{subs.map(s=><option key={s}>{s}</option>)}</Select></FormRow>
      </Grid2>
      <Grid2>
        <FormRow label="Brand"><Input value={form.brand||''} onChange={v=>sf({brand:v})} placeholder="e.g. BYD"/></FormRow>
        <FormRow label="Unit"><Select value={form.unit||'Unit'} onChange={v=>sf({unit:v})}><option>Unit</option><option>Metre</option><option>Set</option><option>Pair</option><option>Roll</option></Select></FormRow>
      </Grid2>
      <FormRow label="Model / description"><Input value={form.model||''} onChange={v=>sf({model:v})} placeholder="e.g. BYD B-Box 5kWh"/></FormRow>
      <Grid2>
        <FormRow label="Unit cost (₦)"><Input type="number" value={form.unit_cost||''} onChange={v=>sf({unit_cost:v})}/></FormRow>
        <FormRow label="Min threshold"><Input type="number" value={form.min_threshold||''} onChange={v=>sf({min_threshold:v})}/></FormRow>
      </Grid2>
      <FormRow label="Max threshold"><Input type="number" value={form.max_threshold||''} onChange={v=>sf({max_threshold:v})}/></FormRow>
      {!isSA() && <Alert type="warning" style={{marginTop:8}}><i className="ti ti-info-circle" aria-hidden="true"/>Will be submitted for Super Admin approval</Alert>}
    </Modal>
  </>;
}

// ── Movements Page ─────────────────────────────────────────────────────────
export function Movements() {
  const { isSA } = useAuth();
  const [movements, loading, reload] = useFetch('/movements');
  const [products] = useFetch('/products');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const sf = v => setForm(f=>({...f,...v}));
  const approved = products.filter(p=>p.status==='Approved');

  const openAdd = () => { setForm({date:today(),product_id:approved[0]?.id||'',movement_type:'Purchase (IN)',quantity:1,source:''}); setModal(true); };
  const save = async () => {
    try { await api.post('/movements', form); setModal(false); reload(); }
    catch (e) { alert(e.message); }
  };
  const selProd = products.find(p=>p.id===form.product_id)||{};

  const filtered = movements.filter(m=>!typeFilter||m.movement_type===typeFilter);
  const IN_T = ['Purchase (IN)','Return (IN)','Transfer IN','Client Return to Stock','Project Return to Stock'];

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Stock movements</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>All IN / OUT transactions</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>Log movement</Btn>
    </div>
    {!isSA() && <Alert type="warning"><i className="ti ti-info-circle" aria-hidden="true"/>Movements require Super Admin approval before affecting stock levels</Alert>}
    <div style={{ marginBottom:12 }}>
      <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:'5px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,background:'var(--color-background-primary)',color:'var(--color-text-primary)' }}>
        <option value="">All types</option>
        {['Purchase (IN)','Return (IN)','Transfer IN','Client Return to Stock','Project Return to Stock','Used in Project (OUT)','Sale (OUT)','Transfer OUT','Damaged/Written Off','Adjustment'].map(t=><option key={t}>{t}</option>)}
      </select>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'date',label:'Date',width:95},
          {key:'product_id',label:'Prod ID',width:80},{key:'product_name',label:'Product',wrap:true},
          {key:'movement_type',label:'Type',width:180,render:r=><Badge color={IN_T.includes(r.movement_type)?'teal':'red'}>{r.movement_type}</Badge>},
          {key:'quantity',label:'Qty',width:70,align:'right',render:r=><strong style={{color:IN_T.includes(r.movement_type)?'#0F6E56':'#A32D2D'}}>{IN_T.includes(r.movement_type)?'+':'-'}{fmtN(r.quantity)}</strong>},
          {key:'total',label:'Value',width:110,align:'right',render:r=>fmt(r.quantity*r.unit_cost)},
          {key:'status',label:'Approval',width:100,render:r=><StatusBadge status={r.status}/>},
          {key:'source',label:'Source',wrap:true},{key:'recorded_by_name',label:'By',width:80},
        ]}
        rows={filtered} empty="No movements recorded"
      />
    </Card>
    <Modal open={modal} title="Log stock movement" onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Date"><Input type="date" value={form.date||''} onChange={v=>sf({date:v})}/></FormRow>
        <FormRow label="Movement type"><Select value={form.movement_type||''} onChange={v=>sf({movement_type:v})}>
          {['Purchase (IN)','Return (IN)','Transfer IN','Client Return to Stock','Project Return to Stock','Used in Project (OUT)','Sale (OUT)','Transfer OUT','Damaged/Written Off','Adjustment'].map(t=><option key={t}>{t}</option>)}
        </Select></FormRow>
      </Grid2>
      <FormRow label="Product ID"><Select value={form.product_id||''} onChange={v=>sf({product_id:v})}>
        {approved.map(p=><option key={p.id} value={p.id}>{p.id} – {p.brand} {p.model}</option>)}
      </Select></FormRow>
      <Grid2>
        <FormRow label="Product name"><Input value={selProd.model||''} readOnly/></FormRow>
        <FormRow label="Category"><Input value={selProd.category||''} readOnly/></FormRow>
      </Grid2>
      <Grid2>
        <FormRow label="Quantity"><Input type="number" value={form.quantity||''} onChange={v=>sf({quantity:v})}/></FormRow>
        <FormRow label="Unit cost (₦)"><Input value={selProd.unit_cost?'₦'+Math.round(selProd.unit_cost).toLocaleString():''} readOnly/></FormRow>
      </Grid2>
      <FormRow label="Total value (₦)"><Input value={selProd.unit_cost&&form.quantity?'₦'+Math.round(selProd.unit_cost*form.quantity).toLocaleString():''} readOnly/></FormRow>
      <Grid2>
        <FormRow label="Source / supplier"><Input value={form.source||''} onChange={v=>sf({source:v})} placeholder="e.g. SolarWorld NG"/></FormRow>
        <FormRow label="Notes (optional)"><Input value={form.notes||''} onChange={v=>sf({notes:v})}/></FormRow>
      </Grid2>
      {!isSA() && <Alert type="warning" style={{marginTop:8}}><i className="ti ti-info-circle" aria-hidden="true"/>Will be pending Super Admin approval</Alert>}
    </Modal>
  </>;
}

// ── Returns Page ──────────────────────────────────────────────────────────
export function Returns() {
  const [returns, loading, reload] = useFetch('/returns');
  const [products] = useFetch('/products');
  const [projects] = useFetch('/projects');
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [editRet, setEditRet] = useState(null);
  const sf = v => setForm(f=>({...f,...v}));
  const approved = products.filter(p=>p.status==='Approved');

  const openAdd = () => { setForm({date:today(),return_type:'Client Return',project_id:projects[0]?.id||'',product_id:approved[0]?.id||'',quantity:1,reason:'',oem:'',sent_to_oem_date:'',oem_response:'',notes:''}); setModal(true); };
  const openEdit = r => { setEditRet(r); setForm({...r}); setEditModal(true); };
  const save = async () => {
    try { await api.post('/returns', form); setModal(false); reload(); }
    catch(e){ alert(e.message); }
  };
  const saveEdit = async () => {
    try { await api.put(`/returns/${editRet.id}`, {...form, reconciled: form.reconciled?1:0}); setEditModal(false); reload(); }
    catch(e){ alert(e.message); }
  };
  const openOem = returns.filter(r=>r.oem&&!r.reconciled);
  const daysSince = d => d ? Math.round((new Date()-new Date(d))/86400000) : null;

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Returns & OEM reconciliation</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Client returns, project returns, warranty claims</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>Log return</Btn>
    </div>
    {openOem.length>0 && <Alert type="warning"><i className="ti ti-refresh" aria-hidden="true"/><strong>{openOem.length} open OEM return{openOem.length>1?'s':''}</strong> — awaiting response or replacement from manufacturer</Alert>}
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:75},{key:'date',label:'Date',width:90},
          {key:'return_type',label:'Type',width:120,render:r=><Badge color={r.return_type==='Client Return'?'red':'blue'}>{r.return_type}</Badge>},
          {key:'project_name',label:'Project',width:130,wrap:true},{key:'product_name',label:'Product',wrap:true},
          {key:'quantity',label:'Qty',width:55,align:'right'},{key:'reason',label:'Reason',wrap:true,width:140},
          {key:'oem',label:'OEM',width:80},{key:'sent_to_oem_date',label:'Sent to OEM',width:100},
          {key:'days',label:'Days open',width:80,render:r=>{ const d=r.sent_to_oem_date&&!r.reconciled?daysSince(r.sent_to_oem_date):null; return d!==null?<Badge color={d>30?'red':d>14?'amber':'green'}>{d}d</Badge>:'—'; }},
          {key:'oem_response',label:'OEM response',wrap:true,width:130},{key:'reconciled',label:'Status',width:90,render:r=>r.reconciled?<Badge color="green">Reconciled</Badge>:<Badge color="amber">Open</Badge>},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={returns} empty="No returns logged"
      />
    </Card>
    <Modal open={modal} title="Log return" onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Date"><Input type="date" value={form.date||''} onChange={v=>sf({date:v})}/></FormRow>
        <FormRow label="Return type"><Select value={form.return_type||'Client Return'} onChange={v=>sf({return_type:v})}><option>Client Return</option><option>Project Return</option></Select></FormRow>
      </Grid2>
      <FormRow label="Project"><Select value={form.project_id||''} onChange={v=>sf({project_id:v})}>{projects.map(p=><option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}</Select></FormRow>
      <FormRow label="Product"><Select value={form.product_id||''} onChange={v=>sf({product_id:v})}>{approved.map(p=><option key={p.id} value={p.id}>{p.id} – {p.brand} {p.model}</option>)}</Select></FormRow>
      <Grid2>
        <FormRow label="Quantity"><Input type="number" value={form.quantity||''} onChange={v=>sf({quantity:v})}/></FormRow>
        <FormRow label="OEM / Manufacturer"><Input value={form.oem||''} onChange={v=>sf({oem:v})} placeholder="Leave blank if not OEM"/></FormRow>
      </Grid2>
      <FormRow label="Reason for return"><Input value={form.reason||''} onChange={v=>sf({reason:v})} placeholder="e.g. Faulty — no charge output"/></FormRow>
      <Grid2>
        <FormRow label="Date sent to OEM"><Input type="date" value={form.sent_to_oem_date||''} onChange={v=>sf({sent_to_oem_date:v})}/></FormRow>
        <FormRow label="OEM response"><Input value={form.oem_response||''} onChange={v=>sf({oem_response:v})} placeholder="e.g. Replacement approved"/></FormRow>
      </Grid2>
      <FormRow label="Notes"><Input value={form.notes||''} onChange={v=>sf({notes:v})}/></FormRow>
    </Modal>
    <Modal open={editModal} title="Update return / reconciliation" onClose={()=>setEditModal(false)} onSave={saveEdit}>
      {editRet && <>
        <Grid2>
          <FormRow label="OEM"><Input value={form.oem||''} onChange={v=>sf({oem:v})}/></FormRow>
          <FormRow label="Date sent to OEM"><Input type="date" value={form.sent_to_oem_date||''} onChange={v=>sf({sent_to_oem_date:v})}/></FormRow>
        </Grid2>
        <FormRow label="OEM response"><Input value={form.oem_response||''} onChange={v=>sf({oem_response:v})} placeholder="e.g. Replacement unit shipped"/></FormRow>
        <FormRow label=""><label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12 }}><input type="checkbox" checked={!!form.reconciled} onChange={e=>sf({reconciled:e.target.checked})} /> Mark as reconciled — closes this return</label></FormRow>
        <FormRow label="Notes"><Input value={form.notes||''} onChange={v=>sf({notes:v})}/></FormRow>
      </>}
    </Modal>
  </>;
}

// ── Projects Page ──────────────────────────────────────────────────────────
export function Projects() {
  const [projects, loading, reload] = useFetch('/projects');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const sf = v => setForm(f=>({...f,...v}));

  const openAdd = () => { setForm({name:'',client:'',project_type:'Commercial',start_date:today(),end_date:'',status:'Planning',manager:'',system_size_kwp:0,notes:''}); setEditing(null); setModal(true); };
  const openEdit = p => { setForm({...p}); setEditing(p.id); setModal(true); };
  const save = async () => {
    try { editing ? await api.put(`/projects/${editing}`, form) : await api.post('/projects', form); setModal(false); reload(); }
    catch(e){ alert(e.message); }
  };

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Projects</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Solar installation projects</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>New project</Btn>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'name',label:'Project',wrap:true,render:r=><div><div style={{fontWeight:500}}>{r.name}</div><div style={{fontSize:10,color:'var(--color-text-secondary)'}}>{r.client}</div></div>},
          {key:'project_type',label:'Type',width:110,render:r=><Badge color="gray">{r.project_type}</Badge>},
          {key:'status',label:'Status',width:100,render:r=><StatusBadge status={r.status}/>},
          {key:'start_date',label:'Start',width:90},{key:'end_date',label:'End',width:90,render:r=>r.end_date||<span style={{color:'var(--color-text-tertiary)'}}>Ongoing</span>},
          {key:'manager',label:'Manager',width:110},{key:'engineer_count',label:'Engineers',width:75,align:'center'},
          {key:'materials_cost',label:'Materials cost',width:120,align:'right',render:r=>fmt(r.materials_cost)},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={projects} empty="No projects yet"
      />
    </Card>
    <Modal open={modal} title={editing?'Edit project':'New project'} onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Status"><Select value={form.status||'Planning'} onChange={v=>sf({status:v})}><option>Planning</option><option>Active</option><option>Completed</option><option>On Hold</option><option>Cancelled</option></Select></FormRow>
        <FormRow label="Project type"><Select value={form.project_type||''} onChange={v=>sf({project_type:v})}><option>Residential</option><option>Commercial</option><option>Industrial</option><option>Agricultural</option><option>Telecom</option><option>Street Lighting</option><option>Other</option></Select></FormRow>
      </Grid2>
      <FormRow label="Project name"><Input value={form.name||''} onChange={v=>sf({name:v})} placeholder="e.g. Lekki Residence Solar"/></FormRow>
      <Grid2>
        <FormRow label="Client / location"><Input value={form.client||''} onChange={v=>sf({client:v})}/></FormRow>
        <FormRow label="Project manager"><Input value={form.manager||''} onChange={v=>sf({manager:v})}/></FormRow>
      </Grid2>
      <Grid2>
        <FormRow label="Start date"><Input type="date" value={form.start_date||''} onChange={v=>sf({start_date:v})}/></FormRow>
        <FormRow label="End date"><Input type="date" value={form.end_date||''} onChange={v=>sf({end_date:v})}/></FormRow>
      </Grid2>
      <Grid2>
        <FormRow label="System size (kWp)"><Input type="number" value={form.system_size_kwp||''} onChange={v=>sf({system_size_kwp:v})}/></FormRow>
        <FormRow label="Notes"><Input value={form.notes||''} onChange={v=>sf({notes:v})}/></FormRow>
      </Grid2>
    </Modal>
  </>;
}

// ── Materials Page ─────────────────────────────────────────────────────────
export function Materials() {
  const [materials, loading, reload] = useFetch('/materials');
  const [products] = useFetch('/products');
  const [projects] = useFetch('/projects');
  const [projFilter, setProjFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const sf = v => setForm(f=>({...f,...v}));
  const approved = products.filter(p=>p.status==='Approved');

  const openAdd = () => { setForm({date:today(),project_id:projects[0]?.id||'',product_id:approved[0]?.id||'',quantity:1}); setModal(true); };
  const save = async () => {
    try { await api.post('/materials', form); setModal(false); reload(); }
    catch(e){ alert(e.message); }
  };
  const selProd = products.find(p=>p.id===form.product_id)||{};
  const selProj = projects.find(p=>p.id===form.project_id)||{};
  const filtered = materials.filter(m=>!projFilter||m.project_id===projFilter);

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Project materials</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Products consumed per project</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>Log material use</Btn>
    </div>
    <div style={{ marginBottom:12 }}>
      <select value={projFilter} onChange={e=>setProjFilter(e.target.value)} style={{ padding:'5px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,background:'var(--color-background-primary)',color:'var(--color-text-primary)' }}>
        <option value="">All projects</option>
        {projects.map(p=><option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
      </select>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'date',label:'Date',width:90},
          {key:'project_id',label:'Proj',width:75},{key:'project_name',label:'Project',wrap:true},
          {key:'product_id',label:'Prod',width:75},{key:'product_name',label:'Product',wrap:true},
          {key:'quantity',label:'Qty',width:65,align:'right',render:r=>`${fmtN(r.quantity)} ${r.unit||''}`},
          {key:'unit_cost',label:'Unit cost',width:110,align:'right',render:r=>fmt(r.unit_cost)},
          {key:'total_cost',label:'Total cost',width:120,align:'right',render:r=><strong>{fmt(r.total_cost)}</strong>},
        ]}
        rows={filtered} empty="No materials logged"
      />
    </Card>
    <Modal open={modal} title="Log material use" onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Date used"><Input type="date" value={form.date||''} onChange={v=>sf({date:v})}/></FormRow>
        <FormRow label="Quantity"><Input type="number" value={form.quantity||''} onChange={v=>sf({quantity:v})}/></FormRow>
      </Grid2>
      <FormRow label="Project"><Select value={form.project_id||''} onChange={v=>sf({project_id:v})}>{projects.map(p=><option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}</Select></FormRow>
      <FormRow label="Project name"><Input value={selProj.name||''} readOnly/></FormRow>
      <FormRow label="Product"><Select value={form.product_id||''} onChange={v=>sf({product_id:v})}>{approved.map(p=><option key={p.id} value={p.id}>{p.id} – {p.brand} {p.model}</option>)}</Select></FormRow>
      <Grid2>
        <FormRow label="Product description"><Input value={selProd.model||''} readOnly/></FormRow>
        <FormRow label="Unit"><Input value={selProd.unit||''} readOnly/></FormRow>
      </Grid2>
      <Grid2>
        <FormRow label="Unit cost (₦)"><Input value={selProd.unit_cost?'₦'+Math.round(selProd.unit_cost).toLocaleString():''} readOnly/></FormRow>
        <FormRow label="Total cost (₦)"><Input value={selProd.unit_cost&&form.quantity?'₦'+Math.round(selProd.unit_cost*form.quantity).toLocaleString():''} readOnly/></FormRow>
      </Grid2>
    </Modal>
  </>;
}

// ── Engineers Page ─────────────────────────────────────────────────────────
export function Engineers() {
  const [engineers, loading, reload] = useFetch('/engineers');
  const [projects] = useFetch('/projects');
  const [projFilter, setProjFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const sf = v => setForm(f=>({...f,...v}));

  const openAdd = () => { setForm({project_id:projects[0]?.id||'',name:'',role:'Site Engineer',date_assigned:today(),date_completed:'',notes:''}); setEditing(null); setModal(true); };
  const openEdit = e => { setForm({...e}); setEditing(e.id); setModal(true); };
  const save = async () => {
    try { editing ? await api.put(`/engineers/${editing}`, form) : await api.post('/engineers', form); setModal(false); reload(); }
    catch(e){ alert(e.message); }
  };
  const selProj = projects.find(p=>p.id===form.project_id)||{};
  const roleColor = { 'Project Manager':'purple','Site Engineer':'teal','Electrical Engineer':'amber','Solar Installer':'green','Technician':'gray','Supervisor':'blue' };
  const filtered = engineers.filter(e=>!projFilter||e.project_id===projFilter);

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Project engineers</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Team members assigned to installations</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>Assign engineer</Btn>
    </div>
    <div style={{ marginBottom:12 }}>
      <select value={projFilter} onChange={e=>setProjFilter(e.target.value)} style={{ padding:'5px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,background:'var(--color-background-primary)',color:'var(--color-text-primary)' }}>
        <option value="">All projects</option>
        {projects.map(p=><option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
      </select>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'name',label:'Engineer',width:140},{key:'role',label:'Role',width:150,render:r=><Badge color={roleColor[r.role]||'gray'}>{r.role}</Badge>},
          {key:'project_id',label:'Proj',width:75},{key:'project_name',label:'Project',wrap:true},
          {key:'date_assigned',label:'Assigned',width:95},{key:'date_completed',label:'Completed',width:95,render:r=>r.date_completed||<span style={{color:'#0F6E56'}}>Active</span>},
          {key:'notes',label:'Notes',wrap:true},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={filtered} empty="No engineers assigned"
      />
    </Card>
    <Modal open={modal} title={editing?'Edit engineer':'Assign engineer'} onClose={()=>setModal(false)} onSave={save}>
      <Grid2>
        <FormRow label="Date assigned"><Input type="date" value={form.date_assigned||''} onChange={v=>sf({date_assigned:v})}/></FormRow>
        <FormRow label="Date completed"><Input type="date" value={form.date_completed||''} onChange={v=>sf({date_completed:v})}/></FormRow>
      </Grid2>
      <FormRow label="Project"><Select value={form.project_id||''} onChange={v=>sf({project_id:v})}>{projects.map(p=><option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}</Select></FormRow>
      <FormRow label="Project name"><Input value={selProj.name||''} readOnly/></FormRow>
      <Grid2>
        <FormRow label="Engineer name"><Input value={form.name||''} onChange={v=>sf({name:v})} placeholder="Full name"/></FormRow>
        <FormRow label="Role"><Select value={form.role||''} onChange={v=>sf({role:v})}><option>Site Engineer</option><option>Electrical Engineer</option><option>Solar Installer</option><option>Project Manager</option><option>Technician</option><option>Supervisor</option><option>Other</option></Select></FormRow>
      </Grid2>
      <FormRow label="Notes"><Input value={form.notes||''} onChange={v=>sf({notes:v})}/></FormRow>
    </Modal>
  </>;
}

// ── Approvals Page ─────────────────────────────────────────────────────────
export function Approvals() {
  const { isSA } = useAuth();
  const [pendingProds, , reloadP] = useFetch('/products');
  const [pendingMvs, , reloadM] = useFetch('/movements');

  if (!isSA()) return <div style={{ textAlign:'center',padding:32,color:'var(--color-text-secondary)' }}>Access restricted to Super Admin</div>;

  const pProds = pendingProds.filter(p=>p.status==='Pending');
  const pMvs = pendingMvs.filter(m=>m.status==='Pending');

  const approve = async (type, id, decision) => {
    try {
      if (type==='product') { await api.post(`/products/${id}/approve`, { decision }); reloadP(); }
      else { await api.post(`/movements/${id}/approve`, { decision }); reloadM(); }
    } catch(e) { alert(e.message); }
  };

  const SectionHead = ({children}) => <div style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',margin:'14px 0 8px',paddingBottom:5,borderBottom:'0.5px solid var(--color-border-tertiary)' }}>{children}</div>;

  return <>
    <div style={{ marginBottom:16 }}><div style={{ fontSize:16,fontWeight:500 }}>Approvals</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Review and approve pending products and stock movements</div></div>
    <SectionHead>Pending products ({pProds.length})</SectionHead>
    {pProds.length===0 ? <Alert type="success"><i className="ti ti-check" aria-hidden="true"/>No pending products</Alert>
    : <Card><DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'brand',label:'Brand',width:90},{key:'model',label:'Model',wrap:true},
          {key:'category',label:'Category',width:110},{key:'unit_cost',label:'Unit cost',width:110,align:'right',render:r=>fmt(r.unit_cost)},
          {key:'actions',label:'Action',width:160,render:r=><div style={{display:'flex',gap:5}}>
            <Btn size="sm" variant="primary" onClick={()=>approve('product',r.id,'Approved')}><i className="ti ti-check" aria-hidden="true"/>Approve</Btn>
            <Btn size="sm" variant="danger" onClick={()=>approve('product',r.id,'Rejected')}><i className="ti ti-x" aria-hidden="true"/></Btn>
          </div>},
        ]}
        rows={pProds} empty="None"
    /></Card>}
    <SectionHead>Pending stock movements ({pMvs.length})</SectionHead>
    {pMvs.length===0 ? <Alert type="success"><i className="ti ti-check" aria-hidden="true"/>No pending movements</Alert>
    : <Card><DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'date',label:'Date',width:90},{key:'product_name',label:'Product',wrap:true},
          {key:'movement_type',label:'Type',width:180},{key:'quantity',label:'Qty',width:65,align:'right'},
          {key:'recorded_by_name',label:'Logged by',width:100},
          {key:'actions',label:'Action',width:160,render:r=><div style={{display:'flex',gap:5}}>
            <Btn size="sm" variant="primary" onClick={()=>approve('movement',r.id,'Approved')}><i className="ti ti-check" aria-hidden="true"/>Approve</Btn>
            <Btn size="sm" variant="danger" onClick={()=>approve('movement',r.id,'Rejected')}><i className="ti ti-x" aria-hidden="true"/></Btn>
          </div>},
        ]}
        rows={pMvs} empty="None"
    /></Card>}
  </>;
}

// ── Categories Page ────────────────────────────────────────────────────────
export function Categories() {
  const { isSA } = useAuth();
  const [cats, loading, reload] = useFetch('/categories');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', subs:'' });
  if (!isSA()) return <div style={{ textAlign:'center',padding:32,color:'var(--color-text-secondary)' }}>Access restricted to Super Admin</div>;

  const openAdd = () => { setForm({ name:'', subs:'' }); setEditing(null); setModal(true); };
  const openEdit = c => { setForm({ name:c.name, subs:c.subs?.map(s=>s.name).join(', ')||'' }); setEditing(c.id); setModal(true); };
  const save = async () => {
    const subs = form.subs.split(',').map(s=>s.trim()).filter(Boolean);
    try { editing ? await api.put(`/categories/${editing}`, {name:form.name,subs}) : await api.post('/categories', {name:form.name,subs}); setModal(false); reload(); }
    catch(e){ alert(e.message); }
  };

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Categories & sub-categories</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Manage product classification</div></div>
      <Btn variant="primary" onClick={openAdd}><i className="ti ti-plus" aria-hidden="true"/>Add category</Btn>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'id',label:'ID',width:80},{key:'name',label:'Category',width:150},
          {key:'subs',label:'Sub-categories',wrap:true,render:r=>(r.subs||[]).map(s=><span key={s.name} style={{display:'inline-block',background:'var(--color-background-secondary)',borderRadius:6,padding:'1px 7px',margin:1,fontSize:10}}>{s.name}</span>)},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={cats} empty="No categories"
      />
    </Card>
    <Modal open={modal} title={editing?'Edit category':'Add category'} onClose={()=>setModal(false)} onSave={save}>
      <FormRow label="Category name"><Input value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. Battery"/></FormRow>
      <FormRow label="Sub-categories (comma-separated)">
        <textarea value={form.subs} onChange={e=>setForm(f=>({...f,subs:e.target.value}))} placeholder="e.g. Lithium (LiFePO4), Lead Acid (AGM), Gel" style={{ width:'100%',padding:'7px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12,minHeight:70,resize:'vertical' }}/>
      </FormRow>
    </Modal>
  </>;
}

// ── Users Page ─────────────────────────────────────────────────────────────
export function Users() {
  const { isSA } = useAuth();
  const [users, loading, reload] = useFetch('/users');
  const [inviteModal, setInviteModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name:'', email:'', role:'Admin' });
  const [editForm, setEditForm] = useState({});
  const [editId, setEditId] = useState(null);
  if (!isSA()) return <div style={{ textAlign:'center',padding:32,color:'var(--color-text-secondary)' }}>Access restricted to Super Admin</div>;

  const sendInvite = async () => {
    try { const r = await api.post('/auth/invite', inviteForm); alert(`Invitation created for ${inviteForm.email}\n\nShare this activation link:\n/accept-invite?token=${r.inviteToken}`); setInviteModal(false); reload(); }
    catch(e){ alert(e.message); }
  };
  const openEdit = u => { setEditForm({name:u.name,role:u.role,status:u.status}); setEditId(u.id); setEditModal(true); };
  const saveEdit = async () => {
    try { await api.put(`/users/${editId}`, editForm); setEditModal(false); reload(); }
    catch(e){ alert(e.message); }
  };

  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>User management</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Manage team access — Super Admin only</div></div>
      <Btn variant="primary" onClick={()=>{setInviteForm({name:'',email:'',role:'Admin'});setInviteModal(true);}}><i className="ti ti-mail" aria-hidden="true"/>Invite user</Btn>
    </div>
    <Alert type="success"><i className="ti ti-shield-check" aria-hidden="true"/>Super Admins approve catalogues and movements. Admins log and view data.</Alert>
    <Card>
      <DataTable
        cols={[
          {key:'name',label:'User',wrap:true,render:r=><div><div style={{fontWeight:500}}>{r.name}</div><div style={{fontSize:10,color:'var(--color-text-secondary)'}}>{r.email}</div></div>},
          {key:'role',label:'Role',width:120,render:r=><Badge color={r.role==='Super Admin'?'purple':'blue'}>{r.role}</Badge>},
          {key:'status',label:'Status',width:90,render:r=><StatusBadge status={r.status}/>},
          {key:'last_login',label:'Last login',width:140,render:r=>r.last_login?new Date(r.last_login).toLocaleString():'Never'},
          {key:'edit',label:'',width:40,render:r=><Btn size="sm" onClick={()=>openEdit(r)}><i className="ti ti-edit" aria-hidden="true"/></Btn>},
        ]}
        rows={users} empty="No users"
      />
    </Card>
    <Modal open={inviteModal} title="Invite user" onClose={()=>setInviteModal(false)} onSave={sendInvite} saveLabel="Send invitation">
      <Alert type="success" style={{marginBottom:12}}><i className="ti ti-mail" aria-hidden="true"/>An invitation link will be generated for the user to activate their account</Alert>
      <FormRow label="Full name"><Input value={inviteForm.name} onChange={v=>setInviteForm(f=>({...f,name:v}))} placeholder="e.g. Amaka Obi"/></FormRow>
      <FormRow label="Email address"><Input type="email" value={inviteForm.email} onChange={v=>setInviteForm(f=>({...f,email:v}))} placeholder="user@safebox.ng"/></FormRow>
      <FormRow label="Role"><Select value={inviteForm.role} onChange={v=>setInviteForm(f=>({...f,role:v}))}><option>Admin</option><option>Super Admin</option></Select></FormRow>
    </Modal>
    <Modal open={editModal} title="Edit user" onClose={()=>setEditModal(false)} onSave={saveEdit}>
      <FormRow label="Full name"><Input value={editForm.name||''} onChange={v=>setEditForm(f=>({...f,name:v}))}/></FormRow>
      <Grid2>
        <FormRow label="Role"><Select value={editForm.role||'Admin'} onChange={v=>setEditForm(f=>({...f,role:v}))}><option>Admin</option><option>Super Admin</option></Select></FormRow>
        <FormRow label="Status"><Select value={editForm.status||'Active'} onChange={v=>setEditForm(f=>({...f,status:v}))}><option>Active</option><option>Inactive</option></Select></FormRow>
      </Grid2>
    </Modal>
  </>;
}

// ── Audit Trail ────────────────────────────────────────────────────────────
export function Audit() {
  const { isSA } = useAuth();
  const [logs, loading, reload] = useFetch('/audit');
  if (!isSA()) return <div style={{ textAlign:'center',padding:32,color:'var(--color-text-secondary)' }}>Access restricted to Super Admin</div>;
  return <>
    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
      <div><div style={{ fontSize:16,fontWeight:500 }}>Audit trail</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>Complete log of all system actions</div></div>
      <Btn onClick={reload}><i className="ti ti-refresh" aria-hidden="true"/>Refresh</Btn>
    </div>
    <Card>
      <DataTable
        cols={[
          {key:'timestamp',label:'Timestamp',width:140,render:r=>new Date(r.timestamp).toLocaleString()},
          {key:'id',label:'ID',width:90},{key:'user_name',label:'User',width:120},
          {key:'action',label:'Action',width:150,render:r=><Badge color="gray">{r.action}</Badge>},
          {key:'entity_type',label:'Entity',width:80},{key:'entity_id',label:'Ref',width:80},
          {key:'detail',label:'Detail',wrap:true},
        ]}
        rows={logs} empty="No audit records"
      />
    </Card>
  </>;
}

// ── Settings Page ──────────────────────────────────────────────────────────
export function Settings() {
  const { user, logout, isSA } = useAuth();
  const [settings, setSettings] = useState({});
  const nav = typeof window !== 'undefined' ? null : null;
  useEffect(() => { api.get('/settings').then(setSettings).catch(()=>{}); }, []);
  const save = async () => {
    try { await api.put('/settings', settings); alert('Settings saved.'); }
    catch(e){ alert(e.message); }
  };
  const Field = ({label,k,type='text'}) => <FormRow label={label}>{type==='checkbox'?<label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={settings[k]==='true'} onChange={e=>setSettings(s=>({...s,[k]:String(e.target.checked)}))}/>{label}</label>:<Input type={type} value={settings[k]||''} onChange={v=>setSettings(s=>({...s,[k]:v}))} readOnly={!isSA()}/> }</FormRow>;

  return <>
    <div style={{ marginBottom:16 }}><div style={{ fontSize:16,fontWeight:500 }}>Settings</div><div style={{ fontSize:11,color:'var(--color-text-secondary)',marginTop:2 }}>System preferences and configuration</div></div>
    <Card style={{ padding:20 }}>
      <div style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10,paddingBottom:6,borderBottom:'0.5px solid var(--color-border-tertiary)' }}>Company information</div>
      <Grid2><Field label="Company name" k="company_name"/><Field label="Company email" k="company_email" type="email"/></Grid2>
      <div style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',margin:'14px 0 10px',paddingBottom:6,borderBottom:'0.5px solid var(--color-border-tertiary)' }}>Regional preferences</div>
      <Grid2>
        <FormRow label="Currency"><Select value={settings.currency||'NGN'} onChange={v=>setSettings(s=>({...s,currency:v}))} style={!isSA()?{opacity:.6,pointerEvents:'none'}:{}}><option>NGN</option><option>USD</option><option>GBP</option></Select></FormRow>
        <FormRow label="Timezone"><Select value={settings.timezone||'Africa/Lagos'} onChange={v=>setSettings(s=>({...s,timezone:v}))} style={!isSA()?{opacity:.6,pointerEvents:'none'}:{}}><option>Africa/Lagos</option><option>UTC</option><option>Europe/London</option></Select></FormRow>
      </Grid2>
      {isSA() && <>
        <div style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',margin:'14px 0 10px',paddingBottom:6,borderBottom:'0.5px solid var(--color-border-tertiary)' }}>Approval workflow</div>
        <FormRow label=""><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={settings.require_approval==='true'} onChange={e=>setSettings(s=>({...s,require_approval:String(e.target.checked)}))}/> Require Super Admin approval for products and movements</label></FormRow>
        <FormRow label=""><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={settings.low_stock_alert==='true'} onChange={e=>setSettings(s=>({...s,low_stock_alert:String(e.target.checked)}))}/> Enable low stock dashboard alerts</label></FormRow>
        <div style={{marginTop:8}}><Btn variant="primary" onClick={save}><i className="ti ti-device-floppy" aria-hidden="true"/>Save settings</Btn></div>
      </>}
    </Card>
    <Card style={{ padding:20 }}>
      <div style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10,paddingBottom:6,borderBottom:'0.5px solid var(--color-border-tertiary)' }}>Session</div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div><div style={{fontSize:13,fontWeight:500}}>{user?.name}</div><div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{user?.email} · {user?.role}</div></div>
        <Btn variant="danger" onClick={async()=>{await logout();window.location.href='/login';}}><i className="ti ti-logout" aria-hidden="true"/>Sign out</Btn>
      </div>
    </Card>
  </>;
}
