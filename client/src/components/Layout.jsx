import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import { useState, useEffect } from 'react';
import api from '../utils/api';

const NavItem = ({ to, icon, label, badge }) => {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return <Link to={to} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:'var(--border-radius-md)',fontSize:12,color:active?'#0F6E56':'var(--color-text-secondary)',background:active?'#E1F5EE':'transparent',fontWeight:active?500:400,textDecoration:'none',marginBottom:1 }}>
    <i className={`ti ti-${icon}`} aria-hidden="true" style={{ fontSize:15,flexShrink:0 }} />
    <span style={{ flex:1 }}>{label}</span>
    {badge>0 && <span style={{ background:'#FCEBEB',color:'#A32D2D',fontSize:9,fontWeight:500,padding:'1px 5px',borderRadius:8,minWidth:16,textAlign:'center' }}>{badge}</span>}
  </Link>;
};

const NavSection = ({ label }) => <div style={{ fontSize:9,fontWeight:500,color:'var(--color-text-tertiary)',textTransform:'uppercase',letterSpacing:'.08em',padding:'8px 6px 3px' }}>{label}</div>;

export default function Layout({ children }) {
  const { user, logout, isSA } = useAuth();
  const nav = useNavigate();
  const [pending, setPending] = useState({ products: 0, movements: 0 });

  useEffect(() => {
    if (isSA()) {
      api.get('/dashboard').then(d => setPending({ total: d.pendingApprovals })).catch(() => {});
    }
  }, []);

  const handleLogout = async () => { await logout(); nav('/login'); };

  return <div style={{ display:'flex',minHeight:'100vh',fontFamily:'var(--font-sans)',fontSize:13,color:'var(--color-text-primary)',background:'var(--color-background-tertiary)' }}>
    <nav style={{ width:210,background:'var(--color-background-primary)',borderRight:'0.5px solid var(--color-border-tertiary)',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',overflowY:'auto' }}>
      <div style={{ padding:'14px 14px 12px',borderBottom:'0.5px solid var(--color-border-tertiary)',display:'flex',alignItems:'center',gap:9 }}>
        <div style={{ width:32,height:32,background:'#0F6E56',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <i className="ti ti-bolt" style={{ fontSize:18,color:'#fff' }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ fontSize:12,fontWeight:500 }}>SafeBox Energy</div>
          <div style={{ fontSize:10,color:'var(--color-text-secondary)' }}>IMS Platform</div>
        </div>
      </div>
      <div style={{ padding:'10px 6px',flex:1,overflowY:'auto' }}>
        <NavSection label="Overview" />
        <NavItem to="/" icon="layout-dashboard" label="Dashboard" />
        <NavSection label="Warehouse" />
        <NavItem to="/inventory" icon="package" label="Product catalogue" />
        <NavItem to="/movements" icon="arrows-exchange" label="Stock movements" />
        <NavItem to="/returns" icon="arrow-back-up" label="Returns & recon." />
        <NavSection label="Operations" />
        <NavItem to="/projects" icon="building-factory" label="Projects" />
        <NavItem to="/materials" icon="tool" label="Project materials" />
        <NavItem to="/engineers" icon="hardhat" label="Engineers" />
        {isSA() && <>
          <NavSection label="Administration" />
          <NavItem to="/approvals" icon="circle-check" label="Approvals" badge={pending.total} />
          <NavItem to="/categories" icon="tags" label="Categories" />
          <NavItem to="/users" icon="users" label="Users" />
          <NavItem to="/audit" icon="file-text" label="Audit trail" />
        </>}
        <NavSection label="System" />
        <NavItem to="/settings" icon="settings" label="Settings" />
      </div>
      <div style={{ padding:'10px 12px',borderTop:'0.5px solid var(--color-border-tertiary)',display:'flex',alignItems:'center',gap:8 }}>
        <Avatar name={user?.name} role={user?.role} />
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:11,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.name}</div>
          <div style={{ fontSize:9,color:'var(--color-text-secondary)' }}>{user?.role}</div>
        </div>
        <button onClick={handleLogout} title="Sign out" aria-label="Sign out" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--color-text-secondary)',padding:4,borderRadius:4 }}>
          <i className="ti ti-logout" aria-hidden="true" style={{ fontSize:15 }} />
        </button>
      </div>
    </nav>
    <main style={{ flex:1,overflowY:'auto',minWidth:0 }}>
      <div style={{ padding:22 }}>{children}</div>
    </main>
  </div>;
}
