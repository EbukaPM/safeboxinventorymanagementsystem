import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); nav('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const quick = (em) => { setEmail(em); setPassword('Admin1234!'); setTimeout(handleLogin, 50); };

  return <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--color-background-tertiary)',fontFamily:'var(--font-sans)',padding:16 }}>
    <div style={{ width:360 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:28,justifyContent:'center' }}>
        <div style={{ width:40,height:40,background:'#0F6E56',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <i className="ti ti-bolt" style={{ fontSize:22,color:'#fff' }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize:16,fontWeight:500 }}>SafeBox Energy</div>
          <div style={{ fontSize:11,color:'var(--color-text-secondary)' }}>Inventory Management System</div>
        </div>
      </div>
      <div style={{ background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-tertiary)',borderRadius:'var(--border-radius-lg)',padding:24 }}>
        <div style={{ fontSize:14,fontWeight:500,marginBottom:16 }}>Sign in to your account</div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4 }}>Email address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@safebox.ng" autoFocus
              style={{ width:'100%',padding:'7px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12 }} />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block',fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:4 }}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"
              style={{ width:'100%',padding:'7px 9px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',fontSize:12 }} />
          </div>
          {error && <div style={{ color:'#A32D2D',fontSize:11,marginBottom:8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width:'100%',padding:'8px',background:'#0F6E56',color:'#fff',border:'none',borderRadius:'var(--border-radius-md)',fontSize:12,fontWeight:500,cursor:loading?'not-allowed':'pointer',opacity:loading?.7:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
            <i className="ti ti-login" aria-hidden="true" />{loading?'Signing in…':'Sign in'}
          </button>
        </form>
        <div style={{ marginTop:14,paddingTop:14,borderTop:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize:11,color:'var(--color-text-secondary)',marginBottom:8,fontWeight:500 }}>Demo accounts</div>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>quick('superadmin@safebox.ng')} style={{ flex:1,padding:'5px',background:'#EEEDFE',color:'#534AB7',border:'none',borderRadius:'var(--border-radius-md)',fontSize:11,fontWeight:500,cursor:'pointer' }}>Super Admin</button>
            <button onClick={()=>quick('admin@safebox.ng')} style={{ flex:1,padding:'5px',background:'#E6F1FB',color:'#185FA5',border:'none',borderRadius:'var(--border-radius-md)',fontSize:11,fontWeight:500,cursor:'pointer' }}>Admin</button>
          </div>
          <div style={{ fontSize:10,color:'var(--color-text-tertiary)',marginTop:8,textAlign:'center' }}>Password: Admin1234!</div>
        </div>
      </div>
    </div>
  </div>;
}
