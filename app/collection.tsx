'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fish, Plus, BookOpen, Upload, Sparkles, LoaderCircle, ArrowRight, Pause, Play, Waves, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import Aquarium, { type AquariumFish } from './aquarium';
import WaterBackground from './water-background';

type Catch = AquariumFish & { date: string; x: number; y: number; source?: string };
const demo: Catch = { id: 'sample-blue', name: '黑鯛 · 小藍', date: '', x: .5, y: .45, image: '/sample-fish.png', sample: true };
const demoPair: Catch[] = [demo, { ...demo, id: 'sample-silver', name: '黑鯛 · 小銀' }];
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error('暫時連線唔到，請重新整理再試。');
  const data = await response.json() as { error?: string; items: Catch[]; item: Catch; generationReady: boolean };
  if (!response.ok) throw Error(data.error || '暫時未能儲存，請再試一次。');
  return data;
}

export default function Collection() {
  const [items, setItems] = useState<Catch[]>([]);
  const [open, setOpen] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);
  const [reveal, setReveal] = useState<Catch | null>(null);
  const [detail, setDetail] = useState<Catch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [samples, setSamples] = useState<Catch[]>(demoPair);
  const [paused, setPaused] = useState(false);
  const submitting = useRef(false);

  const load = useCallback(() => request('/api/catches').then(data => {
    setItems(data.items); setReady(data.generationReady); setNotice(''); setLoadError(false);
  }).catch((error: Error) => {
    setNotice(error.message); setLoadError(true);
  }).finally(() => setLoaded(true)), []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (...args: unknown[]) => Promise<unknown> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(context.registerTool({
      name: 'start_catch_upload', description: 'Open the fish photo upload form; does not upload or generate a fish.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || Object.keys(input).length) throw Error('Expected an empty object');
        setOpen(true); return { status: 'upload_form_open' };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  const residents = useMemo(() => [...items.filter(item => item.id !== reveal?.id), ...samples], [items, reveal, samples]);
  const selectFish = useCallback((fish: AquariumFish) => {
    const item = fish.sample ? demoPair.find(item => item.id === fish.id) : items.find(item => item.id === fish.id);
    if (item) setDetail(item);
  }, [items]);
  function choose(f?: File) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || !f.size || f.size > 10 * 1024 * 1024) {
      setError('請選擇 10 MB 以下嘅 JPG、PNG 或 WebP 圖片。'); return;
    }
    setFile(f); setPhoto(URL.createObjectURL(f)); setError('');
  }
  async function generate() {
    if (!file || submitting.current || ready !== true) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const body = new FormData();
      body.append('image', file); body.append('name', name.trim() || '我的漁獲'); body.append('date', date);
      const data = await request('/api/catches', { method: 'POST', body });
      setItems(all => [...all, data.item]); setOpen(false); setReveal(data.item); setFile(null); setPhoto(''); setName('');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); submitting.current = false; }
  }
  function release() {
    if (reveal?.sample) setSamples(current => current.some(item => item.id === reveal.id) ? current : [...current, reveal]);
    setNotice(reveal?.sample ? '示範魚入缸喇，唔會計入你嘅收藏。' : '新夥伴入缸喇，點魚仔可以睇返釣獲紀錄。');
    setReveal(null);
  }

  return <><WaterBackground paused={paused}/><main className="fish-room">
    <header className="room-header">
      <Link href="/" className="room-brand"><span className="room-brand-icon"><Fish size={24} strokeWidth={1.6}/></span><span>釣魚日和<small>TSURI BIYORI</small></span></Link>
      <nav aria-label="收藏室"><span className="room-nav-active"><Waves size={16}/> 保管箱</span><button className="quiet-button" onClick={() => setAtlas(true)}><BookOpen size={16}/> 魚類圖鑑 <span className="nav-count">{items.length}</span></button></nav>
    </header>
    <section className="aquarium-workspace" aria-labelledby="room-title" aria-busy={!loaded}>
      <div className="room-intro"><div><span className="room-eyebrow">FISH STORAGE / BOX 01</span><h1 id="room-title">魚仔<span>保管箱</span></h1><p>釣到、收集，再慢慢認識每一尾。</p></div><div className="resident-count"><strong>{String(items.length).padStart(2, '0')}</strong><span>尾漁獲<br/>已收集</span></div></div>
      <div className="minimal-fish-frame" aria-label="魚仔水箱"><Aquarium fish={residents} paused={paused} onSelect={selectFish}/></div>
      <div className="outside-tank-tools"><button className="quiet-button" aria-label={paused ? '繼續動畫' : '暫停動畫'} aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? <Play size={13}/> : <Pause size={13}/>}</button>{samples.length > 0 && <button className="quiet-button" onClick={() => setSamples([])}><X size={12}/> 移走示範魚</button>}</div>
      <div className="tank-bottom"><div className="tank-caption"><span className="tiny-fish"><Fish size={20} strokeWidth={1.3}/></span><span>{!loaded ? '魚仔準備中…' : items.length ? '每一次出海，都帶一個故事返嚟。' : '水箱準備好喇，等你第一尾漁獲。'}<small>釣った思い出を、ひとつずつ。</small></span></div><button className="add-catch" onClick={() => setOpen(true)}><span><Plus size={20}/></span> 新增漁獲 <ArrowRight size={16}/></button></div>
      {!items.length && !samples.length && loaded && !loadError && <button className="try-fish" onClick={() => setReveal(demo)}>未出海？先放一尾示範魚試玩 <ArrowRight size={13}/></button>}
      <div className="room-notice" role="status">{notice}{loadError && <button onClick={() => void load()}>重新讀取</button>}</div>
      <div className="swimmer-shortcuts" aria-label="魚仔詳情">{residents.map(item => <button key={item.id} onClick={() => selectFish(item)}><img src={item.image} alt="" loading="lazy"/><span>{item.name}</span>{item.sample && <small>示範</small>}</button>)}</div>
    </section>
    <footer className="room-footer"><span>留住漁獲，也留住好日子。</span><span>一魚一會 <i>✳</i> EST. 2026</span></footer>

    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="fish-dialog" showCloseButton={!busy} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <span className="room-eyebrow">A NEW LITTLE FRIEND</span><DialogTitle className="fish-dialog-title">今日釣到邊一尾？</DialogTitle><DialogDescription>上載魚相，保留佢嘅外形同花紋，變成水箱裡嘅像素魚仔。</DialogDescription>
        <label className={'upload-zone ' + (photo ? 'has-photo' : '')} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) choose(event.dataTransfer.files[0]); }}>
          {photo ? <img src={photo} alt="待生成嘅魚相"/> : <><Upload size={25} strokeWidth={1.5}/><b>揀一張魚相，或者拖入嚟</b><small>JPG、PNG、WebP · 上限 10 MB</small></>}
          <input type="file" aria-label="漁獲照片" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => choose(event.target.files?.[0])}/>{photo && <span className="change-photo">更換相片</span>}
        </label>
        <div className="form-row"><label>魚名／暱稱<input value={name} maxLength={50} placeholder="例如：第一尾黑鯛" disabled={busy} onChange={event => setName(event.target.value)}/></label><label>釣獲日期<input type="date" value={date} required disabled={busy} onChange={event => setDate(event.target.value)}/></label></div>
        {ready === false && <p className="setup-note">魚仔變身功能尚未啟用。你可以先放一尾示範魚試玩。</p>}{error && <p role="alert" className="form-error">{error}</p>}
        <button className="fish-primary" disabled={!file || !date || busy || ready !== true} onClick={() => void generate()}>{busy ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={17}/>} {busy ? '魚仔變身中…' : '生成我的像素魚仔'}</button>{busy && <p className="dialog-hint">好作品需要少少耐性，請保持視窗開啟。</p>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!reveal} onOpenChange={value => { if (!value) release(); }}><DialogContent className="fish-dialog new-fish-dialog">
      <span className="room-eyebrow">{reveal?.sample ? 'SAY HELLO' : 'NEW CATCH UNLOCKED'}</span><DialogTitle className="fish-dialog-title">新夥伴，入手！</DialogTitle><DialogDescription>{reveal?.sample ? '呢尾係示範魚，唔會計入你嘅收藏。' : '漁獲已儲存，準備加入你嘅小世界。'}</DialogDescription>
      <div className="new-fish-portrait">{reveal && <img src={reveal.image} alt={reveal.name}/>}<span className="portrait-spark spark-one">✦</span><span className="portrait-spark spark-two">✧</span></div><strong className="new-fish-name">{reveal?.name}</strong>
      <button className="fish-primary" onClick={release}>放入水箱 <ArrowRight size={17}/></button>
    </DialogContent></Dialog>
    <Dialog open={atlas} onOpenChange={setAtlas}><DialogContent className="fish-dialog atlas-dialog"><span className="room-eyebrow">YOUR CATCH JOURNAL</span><DialogTitle className="fish-dialog-title">魚類圖鑑 <span className="atlas-total">{items.length}</span></DialogTitle><DialogDescription>每一尾，都係你親手釣返嚟嘅回憶。</DialogDescription>
      {items.length ? <div className="atlas-grid">{items.map(item => <button key={item.id} onClick={() => { setAtlas(false); setDetail(item); }}><span><img src={item.image} alt="" loading="lazy"/></span><b>{item.name}</b><small>{item.date}</small></button>)}</div> : <div className="atlas-empty"><Fish size={38} strokeWidth={1}/><p>仲未有漁獲，下一尾會係邊個？</p><button className="fish-primary" onClick={() => { setAtlas(false); setOpen(true); }}>新增第一尾漁獲 <Plus size={16}/></button></div>}
    </DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={value => { if (!value) setDetail(null); }}><DialogContent className="fish-dialog"><span className="room-eyebrow">ONE FISH, ONE STORY</span><DialogTitle className="fish-dialog-title">{detail?.name}</DialogTitle><DialogDescription>{detail?.sample ? '示範魚仔，未計入收藏。' : `釣獲日期：${detail?.date}`}</DialogDescription>{detail && <div className="detail-images"><figure><img src={detail.image} alt={`${detail.name}嘅像素魚仔`}/><figcaption>水箱裡嘅佢</figcaption></figure>{detail.source && <figure><img src={detail.source} alt="原始漁獲照片"/><figcaption>嗰日嘅漁獲</figcaption></figure>}</div>}</DialogContent></Dialog>
  </main></>;
}
