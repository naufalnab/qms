export type Status = 'draft' | 'submitted' | 'under_review' | 'need_revision' | 'resubmitted' | 'approved' | 'rejected' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Condition = 'new' | 'existing';
export type Department = { id: string; name: string };
export type DocumentType = { id: string; name: string; sla: number };
export type HistoryEntry = { action: string; note?: string; actor: string; at: string };
export type Followup = { date: string; result: string; next: string; actor: string };
export type Submission = {
  id: string; number: string; requested: string; condition: Condition; department: string; type: string; docNo: string; title: string; revision: string; reason: string; pic: string; reviewer: string; priority: Priority; sla: number; due: string; status: Status; approval?: string; closed?: string; remarks: string; history: HistoryEntry[]; followups: Followup[];
};

export const departments: Department[] = ['QMS','QC','Production','Warehouse','Purchasing NRM','HRM','Maintenance','Finance','QA','PPIC','RND','Purchasing RM','EXIM','Marketing','Spec','General Affair','House Keeping','Cold Storage','LAB','WHS','HSE','ENG'].map((name, i) => ({ id: String(i + 1), name }));
export const documentTypes: DocumentType[] = [ { id:'form', name:'Form', sla:3 }, { id:'wi', name:'WI', sla:5 }, { id:'sop', name:'SOP', sla:7 }, { id:'policy', name:'Policy', sla:10 }, { id:'external', name:'External Document', sla:5 }, { id:'other', name:'Other', sla:7 } ];
export const statusLabels: Record<Status, string> = { draft:'Draft', submitted:'Diajukan', under_review:'Dalam Review', need_revision:'Perlu Revisi', resubmitted:'Diajukan Ulang', approved:'Disetujui', rejected:'Ditolak', closed:'Ditutup' };
export const statusOrder: Status[] = ['draft','submitted','under_review','need_revision','resubmitted','approved','rejected','closed'];
export const priorityLabels: Record<Priority,string> = { low:'Rendah', medium:'Sedang', high:'Tinggi', critical:'Kritis' };
export const slaLabels = { on_time:'Tepat Waktu', due_soon:'Segera Jatuh Tempo', overdue:'Terlambat', completed:'Selesai' } as const;
const jakartaDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const today = new Date(`${jakartaDate}T12:00:00+07:00`);
const iso = (offset: number) => { const d = new Date(today); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); };
const make = (i:number, status:Status, requestOffset:number, opts:Partial<Submission>={}):Submission => {
  const type = documentTypes[i % documentTypes.length]; const requested=iso(requestOffset), sla=type.sla;
  const dueDate = new Date(`${requested}T12:00:00`); dueDate.setDate(dueDate.getDate()+sla);
  return { id:`demo-${i}`, number:`QMS-${today.getFullYear()}-${String(i).padStart(4,'0')}`, requested, condition:i%3===0?'existing':'new', department:departments[i%departments.length].name, type:type.name, docNo:`${type.name.toUpperCase()}-${['QA','PR','WH','QC'][i%4]}-${String(10+i).padStart(3,'0')}`, title:['Pemeriksaan bahan baku','Pengendalian dokumen','Pembersihan area produksi','Pencatatan hasil inspeksi','Evaluasi pemasok','Pengelolaan perubahan'][i%6], revision:`${String.fromCharCode(65+i%4)}${i%2?'.1':''}`, reason:i%3===0?'Pembaruan persyaratan tahunan':'Dokumen baru', pic:['Rosa Amelia','Dimas Pratama','Siti Rahma','Budi Santoso'][i%4], reviewer:['Andi QMSR','Nina Putri','Rizky Hidayat'][i%3], priority:(['medium','high','low','critical'] as Priority[])[i%4], sla, due:dueDate.toISOString().slice(0,10), status, remarks:i%4===0?'Mohon ditinjau sesuai prosedur terbaru.':'', history:[{action:status,actor:i%2?'Nina Putri':'Rosa Amelia',at:iso(Math.min(requestOffset,0))}], followups:[], ...opts };
};
export const demoSubmissions: Submission[] = [
  make(1,'under_review',-8,{type:'SOP',sla:7,due:iso(-1),docNo:'SOP-QA-014',title:'Pengendalian Dokumen Mutu',priority:'critical',reason:'Pembaruan persyaratan tahunan',history:[{action:'Diajukan',actor:'Rosa Amelia',at:iso(-8)},{action:'Perlu Revisi',actor:'Nina Putri',note:'Mohon sesuaikan daftar distribusi.',at:iso(-6)},{action:'Diajukan Ulang',actor:'Rosa Amelia',at:iso(-4)},{action:'Dalam Review',actor:'Nina Putri',note:'Dokumen sedang diperiksa.',at:iso(-4)}],followups:[{date:iso(-2),result:'Reviewer sudah diingatkan.',next:'Menunggu hasil review.',actor:'Rosa Amelia'},{date:iso(-1),result:'Konfirmasi diterima.',next:'Follow up kembali besok.',actor:'Rosa Amelia'}]}),
  make(2,'need_revision',-7,{type:'WI',sla:5,docNo:'WI-PR-022',priority:'high',reason:'Pembaruan alur kerja',history:[{action:'Diajukan',actor:'Dimas Pratama',at:iso(-7)},{action:'Perlu Revisi',actor:'Andi QMSR',note:'Tambahkan kriteria pemeriksaan.',at:iso(-1)}]}),
  make(3,'approved',-4,{docNo:'FORM-WH-008',approval:iso(-1)}), make(4,'closed',-20,{docNo:'POL-QMS-003',approval:iso(-12),closed:iso(-10)}),
  make(5,'submitted',-1), make(6,'draft',-2), make(7,'resubmitted',-3), make(8,'rejected',-12,{docNo:'SOP-QC-011',history:[{action:'Diajukan',actor:'Siti Rahma',at:iso(-12)},{action:'Ditolak',actor:'Nina Putri',note:'Ruang lingkup tidak sesuai.',at:iso(-8)}]}),
  make(9,'under_review',-1,{due:iso(0)}), make(10,'closed',-45,{closed:iso(-37),approval:iso(-39)}), make(11,'submitted',-1), make(12,'approved',-1), make(13,'need_revision',-1,{due:iso(1)}), make(14,'under_review',-1), make(15,'draft',-1), make(16,'closed',-60,{closed:iso(-52)}), make(17,'resubmitted',-1), make(18,'submitted',0), make(19,'under_review',-1), make(20,'approved',-1)
];

export function calculateDueDate(requested:string, sla:number) { const d=new Date(`${requested}T12:00:00`); d.setDate(d.getDate()+sla); return d.toISOString().slice(0,10); }
export function calculateAging(doc:Submission, todayDate=new Date()) { const end=doc.closed?new Date(`${doc.closed}T12:00:00+07:00`):new Date(`${new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(todayDate)}T12:00:00+07:00`); const start=new Date(`${doc.requested}T12:00:00+07:00`); return Math.max(0,Math.floor((end.getTime()-start.getTime())/86400000)); }
export function getSlaStatus(doc:Submission, todayDate=new Date()): keyof typeof slaLabels { if(doc.status==='closed')return 'completed'; const todayIso=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(todayDate); if(todayIso>doc.due)return 'overdue'; const days=Math.floor((new Date(`${doc.due}T12:00:00+07:00`).getTime()-new Date(`${todayIso}T12:00:00+07:00`).getTime())/86400000); return days<=2?'due_soon':'on_time'; }
export function getActionRequired(doc:Submission) { if(doc.status==='closed'||doc.status==='rejected')return 'Tidak ada tindakan'; if(doc.status==='need_revision')return 'Perbaiki dokumen'; if(doc.status==='approved')return 'Lengkapi dan tutup dokumen'; if(getSlaStatus(doc)==='overdue')return 'Follow up reviewer'; if(getSlaStatus(doc)==='due_soon')return 'Follow up sebelum deadline'; if(doc.status==='submitted'||doc.status==='resubmitted')return 'Menunggu review'; if(doc.status==='under_review')return 'Menunggu hasil review'; return 'Kirim pengajuan'; }
export const allowedTransitions:Record<Status,Status[]>={draft:['submitted'],submitted:['under_review'],under_review:['need_revision','approved','rejected'],need_revision:['resubmitted'],resubmitted:['under_review'],approved:['closed'],rejected:[],closed:[]};
export function canTransitionStatus(from:Status,to:Status,role='admin',note='') { if(!allowedTransitions[from].includes(to))return false; if((to==='need_revision'||to==='rejected')&&!note.trim())return false; if((to==='approved'||to==='rejected'||to==='need_revision'||to==='under_review')&&role==='submitter')return false; if(to==='closed'&&role==='viewer')return false; return role!=='viewer'; }
export const formatDate=(value?:string)=>value?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(`${value.slice(0,10)}T12:00:00+07:00`)):'—';
export const currentMonthKey=()=>`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
export const todayLabel=()=>new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date());
export const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
