'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { demoSubmissions, getSlaStatus } from '@/lib/qms';

const links=[['/','◫','Dashboard'],['/documents','▤','Dokumen'],['/actions','◉','Butuh Tindakan'],['/history','◷','Riwayat'],['/analytics','▥','Analitik'],['/master-data','⚙','Master Data']];
export function AppShell({children}:{children:React.ReactNode}) { const path=usePathname(); const [open,setOpen]=useState(false); const active=links.find(([href])=>href==='/'?path==='/':path.startsWith(href)); const actionCount=demoSubmissions.filter(d=>d.status!=='closed'&&d.status!=='rejected'&&(d.status==='need_revision'||d.status==='approved'||getSlaStatus(d)==='overdue'||getSlaStatus(d)==='due_soon')).length; return <div className="app-frame">
  <aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">q</span><span><b>qms<span className="brand-dot">.</span></b><small>DOCUMENT MONITOR</small></span></Link><div className="workspace-label">WORKSPACE</div><nav>{links.map(([href,icon,label])=><Link key={href} href={href} className={`nav-item ${active?.[0]===href?'active':''}`}><span className="nav-icon">{icon}</span>{label}{label==='Butuh Tindakan'&&<span className="nav-count">{actionCount}</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="avatar">RA</div><div><b>Rosa Amelia</b><small>Administrator</small></div><span className="chevron">⌄</span></div></aside>
  <main className="main-area"><header className="mobile-header"><button className="icon-button" onClick={()=>setOpen(!open)} aria-label="Buka menu">☰</button><Link href="/" className="brand compact"><span className="brand-mark">q</span><b>qms<span className="brand-dot">.</span></b></Link><button className="avatar small-avatar">RA</button></header>{open&&<div className="mobile-menu">{links.map(([href,icon,label])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{icon}　{label}</Link>)}</div>}<div className="page-content">{children}</div></main>
  <nav className="bottom-nav">{[['/','⌂','Home'],['/documents','▤','Dokumen'],['/new','＋','Buat'],['/actions','◉','Tindakan']].map(([href,icon,label])=><Link key={href} href={href} className={(href==='/'?path==='/':path.startsWith(href))?'selected':''}><span>{icon}</span>{label}</Link>)}</nav>
 </div> }
