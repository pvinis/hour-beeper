// icons.jsx — App icon variations (4) + Android variant screens.

// ─── App icon: a small LCD chip in a tile, multiple flavors ───────
function IconLCDChip({ time = '14:00', light = true }) {
  const bg = light ? 'var(--lcd-bg)' : '#0e1207';
  const ink = light ? 'var(--lcd-ink)' : '#b4d05a';
  const ghost = light ? 'rgba(31,36,18,0.10)' : 'rgba(220,250,130,0.06)';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* glass shine */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,0) 38%, rgba(0,0,0,.12) 100%)',
        pointerEvents: 'none',
      }} />
      {/* scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 3, color: light ? 'rgba(20,24,10,.45)' : 'rgba(180,208,90,.45)',
        marginBottom: 4,
      }}>PIP·01</div>
      <div style={{ display: 'inline-flex', fontFamily: 'var(--f-dot)', fontSize: 64, lineHeight: 1, fontVariationSettings: '"ROND" 100', color: ink }}>
        {time.split('').map((ch, i) => (
          ch === ':' ? <span key={i} style={{ padding: '0 0.04em' }}>:</span>
            : <span key={i} style={{ position: 'relative' }}>
                <span style={{ color: ghost }}>8</span>
                <span style={{ position: 'absolute', inset: 0 }}>{ch}</span>
              </span>
        ))}
      </div>
      <div style={{
        marginTop: 6, fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 3,
        color: ink, opacity: 0.7,
      }}>·  ·BEEP·  ·</div>
    </div>
  );
}

// Icon A — Classic LCD with time
function IconA() {
  return (
    <div className="icon-tile" style={{ width: '100%', height: '100%' }}>
      <IconLCDChip time="14:00" light />
    </div>
  );
}

// Icon B — Negative/dark LCD
function IconB() {
  return (
    <div className="icon-tile" style={{ width: '100%', height: '100%' }}>
      <IconLCDChip time="14:00" light={false} />
    </div>
  );
}

// Icon C — Big "P" monogram (wordmark)
function IconC() {
  return (
    <div className="icon-tile" style={{ width: '100%', height: '100%', background: '#1a1c20' }}>
      <div style={{
        position: 'absolute', inset: 10,
        background: 'var(--lcd-bg)',
        borderRadius: '14%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.2)',
        position: 'absolute',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)',
        }} />
        <div style={{
          fontFamily: 'var(--f-pixel)', fontSize: 120, color: 'var(--lcd-ink)', lineHeight: 0.85,
          letterSpacing: 6,
        }}>PIP</div>
        <div style={{
          marginTop: 4,
          display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start',
        }}>
          <span style={{ width: 50, height: 3, background: 'var(--lcd-ink)' }} />
          <span style={{ width: 32, height: 3, background: 'var(--lcd-ink)', opacity: .5, marginLeft: 12 }} />
          <span style={{ width: 16, height: 3, background: 'var(--lcd-ink)', opacity: .25, marginLeft: 24 }} />
        </div>
      </div>
    </div>
  );
}

// Icon D — Amber palette, single dot (the chime)
function IconD() {
  return (
    <div className="icon-tile" style={{ width: '100%', height: '100%', background: '#b8a47a', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)',
      }} />
      {/* concentric beep rings */}
      {[88, 64, 40].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: `${s}%`, height: `${s}%`, transform: 'translate(-50%, -50%)',
          borderRadius: '50%', border: '3px solid #2a1a06',
          opacity: 0.4 - i * 0.08,
        }} />
      ))}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 28, height: 28, borderRadius: '50%', background: '#2a1a06',
      }} />
    </div>
  );
}

// ─── Android variant of Home (Material 3 chrome, same LCD inside) ─
function AndroidHomeContent({ time = '14:00' }) {
  return (
    <div className="app-screen" style={{ paddingBottom: 0 }}>
      {/* No iOS status strip — Android handles its own */}
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PIPLogo size={26} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Battery level={3} />
        </div>
      </div>
      <div style={{ margin: '6px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
        <div className="eyebrow">MODE · HOURLY</div>
        <div className="eyebrow">MON · 14 MAY</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0 4px' }}>
        <GhostNum size={104}>{time}</GhostNum>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>NEXT BEEP IN</div>
        <GhostNum size={36}>00:23:14</GhostNum>
      </div>
      <div className="div-dotted" style={{ margin: '20px 18px 18px' }} />
      <div style={{ padding: '0 18px' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>SOUND · CLASSIC BEEP</div>
        <div style={{
          border: '1.5px solid var(--lcd-ink)',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="t-mono" style={{ fontSize: 11, letterSpacing: 1 }}>♫</span>
          <Waveform playing bars={26} height={26} style={{ flex: 1 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
        <BigToggle on label="HOURLY BEEPS · ON" />
      </div>
      {/* Material bottom nav (overrides LCD TabBar to avoid double nav) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 80, background: '#1a1d18',
        display: 'flex', borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        {[
          { label: 'Home', active: true },
          { label: 'Freq' },
          { label: 'Sound' },
          { label: 'Set' },
        ].map((t, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: t.active ? 'var(--lcd-bg)' : 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
            paddingTop: 12,
          }}>
            <span style={{
              width: 56, height: 28, borderRadius: 14,
              background: t.active ? 'var(--lcd-bg)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.active ? 'var(--lcd-ink)' : 'rgba(255,255,255,0.5)',
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 16 }}>{['◉','◈','♫','⚙'][i]}</span>
            </span>
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AndroidSoundContent() {
  const sounds = [
    { name: 'CLASSIC BEEP', len: '0:01', sel: true },
    { name: 'DOUBLE PIP',   len: '0:01' },
    { name: 'CHIRP',        len: '0:02' },
    { name: 'CHIME',        len: '0:03' },
    { name: 'CLICK · QUIET',len: '0:01' },
    { name: 'CUCKOO',       len: '0:04', locked: true, free: false },
  ];
  return (
    <div className="app-screen" style={{ paddingBottom: 0 }}>
      <div style={{ padding: '12px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>← BACK</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>SOUND</span>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>SHOP</span>
      </div>
      <div className="div-dotted" style={{ margin: '0 18px' }} />
      <div style={{
        margin: '10px 18px 6px', padding: '10px 12px',
        border: '1.5px solid var(--lcd-ink)', background: 'var(--lcd-bg-deep)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, border: '1.5px solid var(--lcd-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 22 }}>▶</span>
        </div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 3 }}>PREVIEWING</div>
          <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 20, letterSpacing: 1, lineHeight: 1 }}>CLASSIC BEEP</div>
        </div>
        <Waveform playing bars={14} height={26} />
      </div>
      {sounds.map((s, i) => (
        <SoundRow key={i} name={s.name} length={s.len} selected={s.sel} locked={s.locked} free={s.free !== false} />
      ))}
      {/* mini Material bottom bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 80, background: '#1a1d18',
        display: 'flex', borderTop: '1px solid rgba(255,255,255,.06)',
      }}>
        {[
          { label: 'Home' },
          { label: 'Freq' },
          { label: 'Sound', active: true },
          { label: 'Set' },
        ].map((t, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: t.active ? 'var(--lcd-bg)' : 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
            paddingTop: 12,
          }}>
            <span style={{
              width: 56, height: 28, borderRadius: 14,
              background: t.active ? 'var(--lcd-bg)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.active ? 'var(--lcd-ink)' : 'rgba(255,255,255,0.5)',
              marginBottom: 4,
            }}>
              <span style={{ fontSize: 16 }}>{['◉','◈','♫','⚙'][i]}</span>
            </span>
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  IconA, IconB, IconC, IconD,
  AndroidHomeContent, AndroidSoundContent,
});
