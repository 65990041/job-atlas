import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jobs from './data/jobs.json';
import locations from './data/locations.json';
import { getFilteredJobs, getMapGroups } from './lib/jobs.js';
import { readPersonal, savePersonal } from './lib/personal.js';
import MapView from './components/MapView.jsx';

const typeLabel = { recommendation: 'แนะนำโดยสถาบัน', open: 'สมัครทั่วไป' };
const precisionLabel = { building: 'ระดับอาคาร', estate: 'ระดับนิคม', district: 'ระดับอำเภอ/เขต', province: 'ระดับจังหวัด' };
const statusLabel = { none: 'ยังไม่จัดสถานะ', interested: 'สนใจ', comparing: 'กำลังเปรียบเทียบ', applied: 'สมัครแล้ว', skipped: 'ตัดออก' };
const emptyFilters = { query: '', applicationType: 'all', major: 'all', province: 'all', minSalary: 'all', personalStatus: 'all' };
const money = value => value == null ? 'ไม่ระบุ' : `${Number(value).toLocaleString('th-TH')} บาท`;

function trapDialogTab(event, panel) {
  if (event.key !== 'Tab' || !panel) return;
  const focusable = [...panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function JobCard({ job, siteText, status, onOpen }) {
  return (
    <button className="job-card" type="button" onClick={() => onOpen(job.id)}>
      <span className="job-card-top"><span className="offer-code">{job.id}</span><span className={`type-pill ${job.applicationType}`}>{typeLabel[job.applicationType]}</span></span>
      <span className="job-title">{job.title}</span>
      <span className="job-company">{job.company}</span>
      <span className="job-card-bottom"><span className="job-location">{siteText}</span><span className="job-salary">{job.salaryBase == null ? 'เงินเดือน: ไม่ระบุ' : `เริ่ม ${money(job.salaryBase)}`}</span></span>
      {status && status !== 'none' && <span className="saved-status">{statusLabel[status]}</span>}
    </button>
  );
}

function LocationMapDialog({ job, groups, note, onClose, returnFocusRef }) {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const [selectedSiteId, setSelectedSiteId] = useState(groups[0]?.siteId ?? null);
  useEffect(() => {
    const previousFocus = returnFocusRef.current || document.activeElement;
    closeRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); }
      trapDialogTab(event, panelRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
      if (document.activeElement !== previousFocus) requestAnimationFrame(() => previousFocus?.focus?.());
    };
  }, [onClose, returnFocusRef]);
  return (
    <div className="location-map-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} className="location-map-dialog" role="dialog" aria-modal="true" aria-label="แผนที่สถานที่ทำงาน">
        <div className="location-map-head"><div><span className="eyebrow">WORK LOCATION</span><h2>แผนที่สถานที่ทำงาน</h2><p>{job.title} · {job.company}</p></div><button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="ปิดแผนที่">×</button></div>
        <div className="location-map-body">
          {groups.length ? <MapView groups={groups} selectedSiteId={selectedSiteId} onSelectSite={setSelectedSiteId} /> : <div className="location-map-empty">ประกาศนี้ยังไม่มีพิกัดที่ระบุได้</div>}
          <div className="location-map-details"><p className="location-source"><strong>ตามประกาศ</strong><br />{job.locationText}</p><div className="location-site-list">{groups.map(group => <button key={group.siteId} type="button" className={selectedSiteId === group.siteId ? 'selected' : ''} aria-pressed={selectedSiteId === group.siteId} onClick={() => setSelectedSiteId(group.siteId)}><strong>{group.site.label}</strong><span>{precisionLabel[group.site.precision]}</span></button>)}</div>{note && <p className="uncertainty-note">{note}</p>}<p className="help-text">หมุดอาจแสดงเพียงระดับนิคม อำเภอ หรือจังหวัด โปรดตรวจสถานที่ทำงานจริงกับบริษัท</p></div>
        </div>
      </section>
    </div>
  );
}

function JobDetail({ job, siteIds, personalEntry, onChangePersonal, onClose }) {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const mapOpenButtonRef = useRef(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const mapOpenRef = useRef(false);
  mapOpenRef.current = showLocationMap;
  const closeLocationMap = useCallback(() => setShowLocationMap(false), []);
  const mapGroups = useMemo(() => getMapGroups([job], locations), [job]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const onKey = event => {
      if (mapOpenRef.current) return;
      if (event.key === 'Escape') onClose();
      trapDialogTab(event, panelRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); previousFocus?.focus?.(); };
  }, [onClose]);
  const sites = siteIds.map(id => locations.sites[id]).filter(Boolean);
  const note = locations.offerNotes[job.id];
  return (
    <div className="detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={panelRef} className="detail-panel" role="dialog" aria-modal="true" aria-label="รายละเอียดงาน" aria-hidden={showLocationMap} inert={showLocationMap}>
        <div className="detail-head"><span className="eyebrow">รายละเอียดตำแหน่ง</span><button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="ปิดรายละเอียด">×</button></div>
        <div className="detail-scroll">
          <div className="detail-id">{job.id} <span className={`type-pill ${job.applicationType}`}>{typeLabel[job.applicationType]}</span></div>
          <h2>{job.title}</h2>
          <p className="detail-company">{job.company}</p>
          <section className="detail-section"><div className="location-heading"><h3>สถานที่ทำงาน</h3><button ref={mapOpenButtonRef} type="button" className="map-open-button" onClick={() => setShowLocationMap(true)}>ดูบนแผนที่</button></div><p>{job.locationText}</p><div className="site-tags">{sites.map((site, index) => <span key={siteIds[index]} className="site-tag">{site.label} · {precisionLabel[site.precision]}</span>)}</div>{note && <p className="uncertainty-note">{note}</p>}</section>
          <div className="detail-facts"><div><span>เงินเดือนพื้นฐานเริ่มต้น</span><strong>{money(job.salaryBase)}</strong></div><div><span>รายได้รวมต่อเดือนที่ระบุชัด</span><strong>{money(job.salaryTotal)}</strong></div></div>
          {job.salaryText && <p className="source-excerpt">ตามประกาศ: {job.salaryText}</p>}
          <section className="detail-section"><h3>ลักษณะงาน</h3><p>{job.description || 'ไม่ระบุ'}</p></section>
          <section className="detail-section"><h3>คุณสมบัติและเวลาทำงาน</h3><p><b>สาขา:</b> {job.majorText}</p><p><b>ทักษะ:</b> {job.skillsText || 'ไม่ระบุ'}</p><p><b>เวลาทำงาน:</b> {job.workdaysText || 'ไม่ระบุ'}</p></section>
          <section className="detail-section"><h3>สวัสดิการและกำหนดการ</h3><p><b>เบี้ยเลี้ยง:</b> {job.allowanceText || 'ไม่ระบุ'}</p><p><b>ปิดรับตามประกาศ:</b> {job.closedText || 'ไม่ระบุ'}</p><p className="help-text">สถานะรับสมัครปัจจุบันยังไม่ได้รับการยืนยัน</p></section>
          <section className="personal-section"><h3>บันทึกของฉัน</h3><p className="help-text">ข้อมูลนี้เก็บในเบราว์เซอร์เครื่องนี้เท่านั้น</p><label htmlFor="personal-status">สถานะของฉัน</label><select id="personal-status" value={personalEntry.status || 'none'} onChange={event => onChangePersonal(job.id, { ...personalEntry, status: event.target.value })}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><label htmlFor="personal-note">บันทึกส่วนตัว</label><textarea id="personal-note" rows="3" value={personalEntry.note || ''} placeholder="เช่น สิ่งที่อยากถามบริษัท" onChange={event => onChangePersonal(job.id, { ...personalEntry, note: event.target.value })} /></section>
          <section className="source-section"><h3>ข้อมูลอ้างอิง</h3><p>ไฟล์ต้นทาง: {job.sourceFile.split('/').pop()}</p><p>ตรวจข้อมูล: 19 พฤศจิกายน 2569</p><p className="help-text">ไฟล์ PDF ต้นทางไม่ได้เผยแพร่บนเว็บนี้</p></section>
        </div>
      </aside>
      {showLocationMap && <LocationMapDialog job={job} groups={mapGroups} note={note} onClose={closeLocationMap} returnFocusRef={mapOpenButtonRef} />}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState(emptyFilters);
  const [personal, setPersonal] = useState(readPersonal);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const filtered = useMemo(() => getFilteredJobs(jobs, filters, locations, personal), [filters, personal]);
  const mapGroups = useMemo(() => getMapGroups(filtered, locations, filters.province), [filtered, filters.province]);
  const selectedJob = jobs.find(job => job.id === selectedJobId);
  const selectedGroup = mapGroups.find(group => group.siteId === selectedSiteId);
  const visibleJobs = view === 'map' && selectedGroup ? selectedGroup.jobs : filtered;
  const provinces = useMemo(() => [...new Set(Object.values(locations.sites).map(site => site.province))].sort((a, b) => a.localeCompare(b, 'th')), []);
  const setFilter = (name, value) => { setFilters(current => ({ ...current, [name]: value })); setSelectedSiteId(null); };
  const changePersonal = (id, entry) => setPersonal(current => { const next = { ...current, [id]: entry }; savePersonal(next); return next; });
  const closeDetail = useCallback(() => setSelectedJobId(null), []);

  return (
    <>
      <a className="skip-link" href="#main">ข้ามไปเนื้อหา</a>
      <header className="site-header"><div className="shell header-inner"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><div><strong>Job Atlas</strong><span>สำรวจงานในที่เดียว</span></div></div><nav aria-label="หน้าหลัก" className="top-nav"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>รายการงาน</button><button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>แผนที่</button></nav><span className="header-meta">ข้อมูลประกาศปี 2569</span></div></header>
      <main id="main" className="shell">
        <section className="hero"><div><span className="eyebrow">YOUR NEXT STEP, MADE CLEAR</span><h1>เห็นงานที่สนใจ<br/><em>ในที่ที่อยากไป</em></h1><p>รวมประกาศงานจากเอกสารชุดเดียวกัน ค้นหา เปรียบเทียบ และดูสถานที่ทำงานบนแผนที่</p></div><div className="hero-side"><span className="hero-number">55</span><span>ตำแหน่งจาก 2 รูปแบบการสมัคร</span><span className="hero-date">ตรวจข้อมูล 19 พฤศจิกายน 2569</span></div></section>
        <section className="summary-strip" aria-label="ภาพรวมประกาศ"><div><strong>55</strong><span>ตำแหน่งทั้งหมด</span></div><div><strong>35</strong><span>แนะนำโดยสถาบัน</span></div><div><strong>20</strong><span>สมัครทั่วไป</span></div><div><strong>{provinces.length}</strong><span>จังหวัดที่ระบุ</span></div></section>
        <div className="workspace">
          <aside className="filter-panel" aria-label="ตัวกรองงาน"><div className="filter-head"><h2>ค้นหางาน</h2><button type="button" onClick={() => { setFilters(emptyFilters); setSelectedSiteId(null); }}>ล้างตัวกรอง</button></div><div className="filter-stack"><label>ค้นหาตำแหน่งหรือบริษัท<input type="search" value={filters.query} placeholder="ตำแหน่ง บริษัท หรือรหัส" onChange={event => setFilter('query', event.target.value)} /></label><label>รูปแบบการสมัคร<select value={filters.applicationType} onChange={event => setFilter('applicationType', event.target.value)}><option value="all">ทั้งหมด</option><option value="recommendation">แนะนำโดยสถาบัน</option><option value="open">สมัครทั่วไป</option></select></label><label>สาขาที่รับ<select value={filters.major} onChange={event => setFilter('major', event.target.value)}><option value="all">ทุกสาขา</option><option value="Mechatronics Engineering">เมคคาทรอนิกส์</option><option value="Computer Engineering">คอมพิวเตอร์</option></select></label><label>จังหวัด<select value={filters.province} onChange={event => setFilter('province', event.target.value)}><option value="all">ทุกจังหวัด</option>{provinces.map(province => <option key={province} value={province}>{province}</option>)}</select></label><label>เงินเดือนพื้นฐานขั้นต่ำ<select value={filters.minSalary} onChange={event => setFilter('minSalary', event.target.value)}><option value="all">ไม่กำหนด</option><option value="15000">15,000 บาท</option><option value="20000">20,000 บาท</option><option value="25000">25,000 บาท</option><option value="30000">30,000 บาท</option></select></label><label>กรองตามสถานะ<select value={filters.personalStatus} onChange={event => setFilter('personalStatus', event.target.value)}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="all">ทุกสถานะ</option></select></label></div><p className="filter-footnote">เงินเดือนที่ไม่ระบุจะไม่อยู่ในผลลัพธ์เมื่อกรองขั้นต่ำ</p></aside>
          <section className={`results-section ${view === 'map' ? 'map-mode' : ''}`} aria-label={view === 'list' ? 'รายการงาน' : 'แผนที่งาน'}><div className="results-head"><div><span className="eyebrow">EXPLORE OPPORTUNITIES</span><h2>{view === 'list' ? 'ตำแหน่งงาน' : 'แผนที่งาน'}</h2><p className="result-count" aria-live="polite">{filtered.length} ตำแหน่ง</p></div><div className="view-switch" role="group" aria-label="รูปแบบการดู"><button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>รายการ</button><button type="button" className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')}>แผนที่</button></div></div>
            {view === 'map' && <div className="map-panel"><div className="map-intro"><span>หมุดแสดงตามระดับข้อมูลที่พบในประกาศ</span><span><i className="legend-dot solid" /> อาคาร/นิคม <i className="legend-dot pale" /> พื้นที่โดยประมาณ</span></div><MapView groups={mapGroups} selectedSiteId={selectedSiteId} onSelectSite={setSelectedSiteId} /><div className="map-footer"><label className="map-site-picker">เลือกพื้นที่บนแผนที่<select value={selectedSiteId || ''} onChange={event => setSelectedSiteId(event.target.value || null)}><option value="">ทุกพื้นที่</option>{mapGroups.map(group => <option key={group.siteId} value={group.siteId}>{group.site.label} · {group.jobs.length} ตำแหน่ง</option>)}</select></label><span>พิกัดบางแห่งเป็นเพียงระดับอำเภอหรือจังหวัด โปรดตรวจสถานที่จริงกับบริษัท</span></div></div>}
            {view === 'map' && <div className="selected-place"><div><strong>{selectedGroup ? selectedGroup.site.label : 'งานทุกพื้นที่'}</strong><span>{selectedGroup ? `${precisionLabel[selectedGroup.site.precision]} · ${selectedGroup.jobs.length} ตำแหน่ง` : `${filtered.length} ตำแหน่งบนแผนที่`}</span></div>{selectedGroup && <button type="button" onClick={() => setSelectedSiteId(null)}>แสดงทุกพื้นที่</button>}</div>}
            {visibleJobs.length ? <div className="job-list">{visibleJobs.map(job => <JobCard key={job.id} job={job} siteText={(locations.offerSites[job.id] || []).map(id => locations.sites[id]?.label).filter(Boolean).join(' / ') || 'ไม่ระบุ'} status={personal[job.id]?.status} onOpen={setSelectedJobId} />)}</div> : <div className="empty-state"><strong>ยังไม่พบงานที่ตรงกับตัวกรอง</strong><p>ลองปรับคำค้นหรือช่วงเงินเดือนอีกครั้ง</p></div>}
          </section>
        </div>
      </main>
      <footer className="site-footer"><div className="shell"><span>Job Atlas · ข้อมูลจากประกาศที่ได้รับ ณ 19 พฤศจิกายน 2569</span><span>แผนที่ © OpenStreetMap contributors · สถานะการรับสมัครต้องยืนยันกับสถาบัน</span></div></footer>
      {selectedJob && <JobDetail job={selectedJob} siteIds={locations.offerSites[selectedJob.id] || []} personalEntry={personal[selectedJob.id] || {}} onChangePersonal={changePersonal} onClose={closeDetail} />}
    </>
  );
}
