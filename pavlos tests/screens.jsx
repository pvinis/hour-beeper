// screens.jsx — every PIP app screen.
// Each screen is the inner content of an iPhone frame (full 402×800-ish).

// ─── HOME — ON state (the marquee screen) ───────────────────────────────
function ScreenHomeOn({ time = '14:00', countdown = '00:23:14' }) {
  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '14px 18px 0' }}>
        <PIPLogo size={28} />
      </div>

      {/* mode label */}
      <div style={{
        margin: '6px 18px 0',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div className="eyebrow">MODE · HOURLY</div>
        <div className="eyebrow">MON · 14 MAY</div>
      </div>

      {/* giant clock */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 0 8px' }}>
        <GhostNum size={110}>{time}</GhostNum>
      </div>

      {/* countdown */}
      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>NEXT BEEP IN</div>
        <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
          <GhostNum size={42}>{countdown}</GhostNum>
        </div>
      </div>

      {/* divider */}
      <div className="div-dotted" style={{ margin: '26px 18px 18px' }} />

      {/* sound + waveform card */}
      <div style={{ padding: '0 18px' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>SOUND · CLASSIC BEEP</div>
        <div style={{
          border: '1.5px solid var(--lcd-ink)',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="t-mono" style={{ fontSize: 11, letterSpacing: 1 }}>♫</span>
          <Waveform playing bars={28} height={28} style={{ flex: 1 }} />
          <span className="t-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--lcd-ink-dim)' }}>0:01</span>
        </div>
      </div>

      {/* big physical toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <BigToggle on label="HOURLY BEEPS · ON" />
      </div>

      <TabBar active="home" />
    </div>
  );
}

// ─── HOME — OFF state ──────────────────────────────────────────────────
function ScreenHomeOff({ time = '14:00' }) {
  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '14px 18px 0' }}>
        <PIPLogo size={28} />
      </div>
      <div style={{ margin: '6px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
        <div className="eyebrow">MODE · HOURLY</div>
        <div className="eyebrow" style={{ color: 'var(--red-led)' }}>● PAUSED</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 0 8px', opacity: 0.55 }}>
        <GhostNum size={110}>{time}</GhostNum>
      </div>

      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div className="eyebrow">NO BEEPS SCHEDULED</div>
        <div className="t-mono" style={{ fontSize: 12, letterSpacing: 2, marginTop: 8, color: 'var(--lcd-ink-dim)' }}>
          TOGGLE ON TO RESUME
        </div>
      </div>

      <div className="div-dotted" style={{ margin: '26px 18px 18px' }} />

      <div style={{ padding: '0 18px', opacity: 0.6 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>SOUND · CLASSIC BEEP</div>
        <div style={{ border: '1.5px dashed var(--lcd-ink-dim)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-mono" style={{ fontSize: 11, letterSpacing: 1 }}>♫</span>
          <Waveform playing={false} bars={28} height={28} style={{ flex: 1 }} />
          <span className="t-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--lcd-ink-dim)' }}>0:01</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <BigToggle on={false} label="HOURLY BEEPS · OFF" />
      </div>

      <TabBar active="home" />
    </div>
  );
}

// ─── FREQUENCY PICKER ──────────────────────────────────────────────────
function ScreenFrequency() {
  const opts = [
    { id: 1,  every: 'EVERY HOUR',      sub: 'XX:00 · DEFAULT' },
    { id: 2,  every: 'EVERY 2 HOURS',   sub: 'EVEN HOURS' },
    { id: 3,  every: 'EVERY 3 HOURS',   sub: '09 · 12 · 15 · 18 · 21' },
    { id: 4,  every: 'EVERY 6 HOURS',   sub: '06 · 12 · 18 · 00' },
    { id: 5,  every: 'CUSTOM HOURS',    sub: 'PICK SPECIFIC HOURS →' },
  ];
  const selected = 1;
  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>◀ BACK</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>FREQUENCY</span>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--lcd-ink-dim)' }}>SAVE</span>
      </div>

      <div className="div-dotted" style={{ margin: '6px 18px 0' }} />

      <div style={{ padding: '4px 0' }}>
        {opts.map((o) => (
          <div
            key={o.id}
            className={`lcd-row ${o.id === selected ? 'sel' : ''}`}
            style={{ paddingLeft: 18, paddingRight: 18 }}
          >
            <div style={{
              width: 22, height: 22,
              border: '2px solid currentColor',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {o.id === selected && (
                <span style={{ width: 10, height: 10, background: 'currentColor', borderRadius: '50%' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 24, letterSpacing: 1, lineHeight: 1 }}>{o.every}</div>
              <div className="row-meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 1.5, marginTop: 4, color: o.id === selected ? 'var(--lcd-bg)' : 'var(--lcd-ink-dim)', opacity: o.id === selected ? 0.7 : 1 }}>
                {o.sub}
              </div>
            </div>
            {o.id === 5 && (
              <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 22, opacity: 0.7 }}>▶</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '18px 18px 0' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>PREVIEW · NEXT 5</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: 6,
          border: '1px solid var(--lcd-ink-dim)',
          padding: '10px 12px',
        }}>
          {['15:00', '16:00', '17:00', '18:00', '19:00'].map((t, i) => (
            <span key={i} style={{
              fontFamily: 'var(--f-pixel)', fontSize: 18, letterSpacing: 1,
              opacity: i === 0 ? 1 : 0.6,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <TabBar active="freq" />
    </div>
  );
}

// ─── CUSTOM HOURS — 24h grid ───────────────────────────────────────────
function ScreenCustomHours() {
  // selected hours
  const on = new Set([8, 9, 10, 11, 14, 15, 16, 17, 20]);
  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>◀ FREQ</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>CUSTOM</span>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>SAVE</span>
      </div>

      <div className="div-dotted" style={{ margin: '6px 18px 0' }} />

      <div style={{ padding: '12px 18px 6px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>TAP HOURS TO TOGGLE · {on.size} SELECTED</div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 4,
          border: '1.5px solid var(--lcd-ink)',
          padding: 4, background: 'var(--lcd-bg-deep)',
        }}>
          {Array.from({ length: 24 }).map((_, h) => {
            const lit = on.has(h);
            return (
              <div key={h} className={`hour-cell ${lit ? 'on' : 'off'}`}>
                {/* faint ghost number behind */}
                <span style={{ position: 'absolute', color: lit ? 'transparent' : 'var(--lcd-ghost)' }}>88</span>
                <span style={{ position: 'relative' }}>{String(h).padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '8px 18px 0' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>QUICK SET</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL DAY', 'WORK 9–17', 'WAKING 7–22', 'NONE'].map((p, i) => (
            <span key={i} style={{
              fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: 1.5,
              padding: '6px 10px',
              border: '1px solid var(--lcd-ink)',
              background: i === 1 ? 'var(--lcd-ink)' : 'transparent',
              color: i === 1 ? 'var(--lcd-bg)' : 'var(--lcd-ink)',
            }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 18px 0' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>PREVIEW · TODAY</div>
        <div style={{
          display: 'flex', gap: 2, height: 22,
          border: '1px solid var(--lcd-ink-dim)',
        }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} style={{
              flex: 1,
              background: on.has(h) ? 'var(--lcd-ink)' : 'transparent',
            }} />
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 4,
          fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 1, color: 'var(--lcd-ink-dim)',
        }}>
          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
        </div>
      </div>

      <TabBar active="freq" />
    </div>
  );
}

// ─── SOUND PICKER ──────────────────────────────────────────────────────
function ScreenSound() {
  const sounds = [
    { name: 'CLASSIC BEEP', len: '0:01', sel: true,  locked: false },
    { name: 'DOUBLE PIP',   len: '0:01', sel: false, locked: false },
    { name: 'CHIRP',        len: '0:02', sel: false, locked: false },
    { name: 'CHIME',        len: '0:03', sel: false, locked: false },
    { name: 'CLICK · QUIET',len: '0:01', sel: false, locked: false },
    { name: 'CUCKOO',       len: '0:04', sel: false, locked: true,  free: false },
    { name: 'SHIP BELL',    len: '0:03', sel: false, locked: true,  free: false },
  ];

  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>◀ BACK</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>SOUND</span>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>SHOP ▸</span>
      </div>

      <div className="div-dotted" style={{ margin: '6px 18px 0' }} />

      {/* now playing strip */}
      <div style={{
        margin: '10px 18px 6px',
        padding: '10px 12px',
        border: '1.5px solid var(--lcd-ink)',
        background: 'var(--lcd-bg-deep)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, border: '1.5px solid var(--lcd-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 22 }}>▶</span>
        </div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 3 }}>NOW PREVIEWING</div>
          <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 20, letterSpacing: 1, lineHeight: 1 }}>CLASSIC BEEP</div>
        </div>
        <Waveform playing bars={14} height={26} />
      </div>

      {/* list — bound height so it scrolls visually within frame */}
      <div style={{ marginBottom: 56 }}>
        {sounds.map((s, i) => (
          <SoundRow key={i} name={s.name} length={s.len} selected={s.sel} locked={s.locked} free={s.free !== false} />
        ))}
      </div>

      <TabBar active="snd" />
    </div>
  );
}

// ─── SETTINGS ──────────────────────────────────────────────────────────
function ScreenSettings() {
  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>◀ BACK</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>SETTINGS</span>
        <span style={{ width: 30 }} />
      </div>
      <div className="div-dotted" style={{ margin: '6px 18px 0' }} />

      <LCDSection title="VOLUME">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="t-mono" style={{ fontSize: 11 }}>LOW</span>
          <div style={{
            flex: 1, height: 18,
            border: '1.5px solid var(--lcd-ink)',
            padding: 2,
            display: 'flex', gap: 2,
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{
                flex: 1,
                background: i < 8 ? 'var(--lcd-ink)' : 'transparent',
              }} />
            ))}
          </div>
          <span className="t-mono" style={{ fontSize: 11 }}>HI</span>
        </div>
      </LCDSection>

      <LCDSection title="VIBRATION" right="ON">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 20 }}>BUZZ ON BEEP</span>
          <PixelToggle on />
        </div>
      </LCDSection>

      <LCDSection title="SILENT HOURS" right="22:00 → 07:00">
        <div style={{
          border: '1.5px solid var(--lcd-ink-dim)',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow">FROM</div>
            <div style={{ fontFamily: 'var(--f-dot)', fontSize: 36, lineHeight: 1, fontVariationSettings: '"ROND" 100' }}>22:00</div>
          </div>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 28 }}>→</span>
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow">UNTIL</div>
            <div style={{ fontFamily: 'var(--f-dot)', fontSize: 36, lineHeight: 1, fontVariationSettings: '"ROND" 100' }}>07:00</div>
          </div>
        </div>
      </LCDSection>

      <LCDSection title="DISPLAY">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 20 }}>NEGATIVE LCD</span>
          <PixelToggle on={false} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 20 }}>24-HOUR FORMAT</span>
          <PixelToggle on />
        </div>
      </LCDSection>

      <LCDSection title="ABOUT">
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--lcd-ink-dim)', lineHeight: 1.6 }}>
          PIP · V1.0.0<br/>
          NO ACCOUNT NEEDED<br/>
          NO TRACKING · NO ADS
        </div>
      </LCDSection>

      <TabBar active="set" />
    </div>
  );
}

// ─── SOUND PACK STORE ─────────────────────────────────────────────────
function ScreenStore() {
  const packs = [
    { name: 'SUBMARINE',     subs: '6 SOUNDS · SONAR · DIVE',  price: '$1.99', tag: 'NEW' },
    { name: 'GRANDFATHER',   subs: '5 SOUNDS · CHIMES · BELL', price: '$1.99' },
    { name: 'ARCADE',        subs: '8 SOUNDS · 8-BIT BLEEPS',  price: '$2.99' },
    { name: 'BIRD CALLS',    subs: '6 SOUNDS · FIELD REC',     price: '$1.99' },
  ];

  return (
    <div className="app-screen">
      <LCDStatusStrip />
      <div style={{ padding: '12px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-mono" style={{ fontSize: 11, letterSpacing: 2 }}>◀ SOUNDS</span>
        <span className="title-lcd" style={{ letterSpacing: 4 }}>SOUND PACKS</span>
        <span style={{ width: 30 }} />
      </div>
      <div className="div-dotted" style={{ margin: '6px 18px 0' }} />

      {/* featured */}
      <div style={{ margin: '12px 18px 0', border: '1.5px solid var(--lcd-ink)', padding: 14, background: 'var(--lcd-bg-deep)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="eyebrow">FEATURED</span>
          <span className="eyebrow" style={{ background: 'var(--lcd-ink)', color: 'var(--lcd-bg)', padding: '2px 6px' }}>NEW</span>
        </div>
        <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 34, letterSpacing: 2, lineHeight: 1, margin: '8px 0 4px' }}>
          SUBMARINE
        </div>
        <div className="t-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--lcd-ink-dim)', marginBottom: 10 }}>
          6 SOUNDS · DIVE HORN · SONAR PING · GENERAL QUARTERS
        </div>
        <Waveform playing bars={36} height={28} />
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 26 }}>$1.99</span>
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: 2,
            padding: '8px 12px', background: 'var(--lcd-ink)', color: 'var(--lcd-bg)',
          }}>UNLOCK ▸</span>
        </div>
      </div>

      {/* list */}
      <div style={{ padding: '14px 18px 0' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>ALL PACKS</div>
        {packs.slice(1).map((p, i) => (
          <div key={i} className="lcd-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <div style={{
              width: 38, height: 38, border: '1.5px solid var(--lcd-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--f-mono)', fontSize: 16,
            }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 22, letterSpacing: 1, lineHeight: 1 }}>{p.name}</div>
              <div className="row-meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 1.5, marginTop: 4, color: 'var(--lcd-ink-dim)' }}>{p.subs}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 20 }}>{p.price}</div>
              <div className="t-mono" style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--lcd-ink-dim)' }}>PREVIEW ▶</div>
            </div>
          </div>
        ))}
      </div>

      <TabBar active="snd" />
    </div>
  );
}

// ─── ONBOARDING #1 — Hero ─────────────────────────────────────────────
function ScreenOnboard1() {
  return (
    <div className="app-screen">
      <div style={{ padding: '40px 18px 0' }}>
        <PIPLogo size={56} />
      </div>

      <div style={{
        marginTop: 60, padding: '0 22px',
        fontFamily: 'var(--f-pixel)', fontSize: 44, lineHeight: 1.05, letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        AN HOURLY<br/>BEEP, LIKE<br/>YOUR OLD<br/>WATCH.
      </div>

      <div style={{ padding: '20px 22px 0', maxWidth: 340 }} className="t-mono">
        <p style={{ fontSize: 13, letterSpacing: 1, lineHeight: 1.6, color: 'var(--lcd-ink-dim)' }}>
          PIP IS A QUIET, NOSTALGIC LITTLE APP THAT MARKS THE PASSING HOUR — JUST LIKE THE CASIO ON YOUR DAD'S WRIST.
        </p>
      </div>

      {/* big illustration block — placeholder rect */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <div style={{
          width: 220, height: 110,
          border: '1.5px solid var(--lcd-ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6,
        }}>
          <Waveform playing bars={26} height={50} />
          <span className="t-mono" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--lcd-ink-dim)' }}>·BEEP·</span>
        </div>
      </div>

      {/* dots + next */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 10, height: 10,
              background: i === 0 ? 'var(--lcd-ink)' : 'transparent',
              border: '1.5px solid var(--lcd-ink)',
            }} />
          ))}
        </div>
        <span className="phys-btn">NEXT ▸</span>
      </div>
    </div>
  );
}

// ─── ONBOARDING #2 — How it works ─────────────────────────────────────
function ScreenOnboard2() {
  return (
    <div className="app-screen">
      <div style={{ padding: '40px 18px 0' }}>
        <PIPLogo size={28} />
      </div>

      <div style={{
        marginTop: 36, padding: '0 22px',
        fontFamily: 'var(--f-pixel)', fontSize: 36, lineHeight: 1.05, letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        THREE<br/>SWITCHES.<br/>NOTHING<br/>ELSE.
      </div>

      <div style={{ padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          { n: '01', t: 'ON / OFF',           d: 'A big satisfying toggle. Flip it; you\'re done.' },
          { n: '02', t: 'HOW OFTEN',          d: 'Every hour. Every two. Or pick exact hours of the day.' },
          { n: '03', t: 'WHICH BEEP',         d: 'Five classic sounds. More in optional sound packs.' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 14 }}>
            <div style={{
              fontFamily: 'var(--f-dot)', fontSize: 30, lineHeight: 1,
              color: 'var(--lcd-ink-dim)', fontVariationSettings: '"ROND" 100', minWidth: 40,
            }}>{s.n}</div>
            <div>
              <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 22, letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>{s.t}</div>
              <div className="t-mono" style={{ fontSize: 11, letterSpacing: 1, lineHeight: 1.5, color: 'var(--lcd-ink-dim)' }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 10, height: 10,
              background: i === 1 ? 'var(--lcd-ink)' : 'transparent',
              border: '1.5px solid var(--lcd-ink)',
            }} />
          ))}
        </div>
        <span className="phys-btn">NEXT ▸</span>
      </div>
    </div>
  );
}

// ─── ONBOARDING #3 — Permissions ──────────────────────────────────────
function ScreenOnboard3() {
  return (
    <div className="app-screen">
      <div style={{ padding: '40px 18px 0' }}>
        <PIPLogo size={28} />
      </div>

      <div style={{
        marginTop: 32, padding: '0 22px',
        fontFamily: 'var(--f-pixel)', fontSize: 36, lineHeight: 1.05, letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        ALLOW<br/>NOTIFICATIONS<br/>SO PIP CAN<br/>BEEP.
      </div>

      <div style={{ padding: '14px 22px 0' }}>
        <p className="t-mono" style={{ fontSize: 12, letterSpacing: 1, lineHeight: 1.6, color: 'var(--lcd-ink-dim)' }}>
          PIP USES THE NOTIFICATION SOUND TO BEEP IN THE BACKGROUND. NOTHING IS SENT ANYWHERE.
        </p>
      </div>

      <div style={{ padding: '26px 22px 0' }}>
        <div style={{
          border: '1.5px solid var(--lcd-ink)',
          padding: 14,
        }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>WHAT PIP NEVER ASKS FOR</div>
          {['ACCOUNTS', 'EMAIL', 'CONTACTS', 'LOCATION', 'YOUR BIRTHDAY'].map((x, i) => (
            <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span style={{
                fontFamily: 'var(--f-pixel)', fontSize: 18, letterSpacing: 1,
                width: 22, textAlign: 'center',
              }}>✕</span>
              <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 20, letterSpacing: 1 }}>{x}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 10, height: 10,
              background: i === 2 ? 'var(--lcd-ink)' : 'transparent',
              border: '1.5px solid var(--lcd-ink)',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="phys-btn" style={{ flex: 1, textAlign: 'center' }}>ALLOW + START</span>
          <span className="phys-btn" style={{ background: 'transparent', color: 'var(--lcd-ink)', boxShadow: 'inset 0 0 0 1px var(--lcd-ink)', textShadow: 'none' }}>SKIP</span>
        </div>
      </div>
    </div>
  );
}

// ─── BEEP-HAPPENING (wild one) — full-bleed alert ─────────────────────
function ScreenBeeping() {
  return (
    <div className="app-screen lcd-dark" style={{ background: 'var(--lcd-bg)' }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          fontFamily: 'var(--f-mono)', fontSize: 12, letterSpacing: 4, color: 'var(--lcd-ink-dim)',
        }}>·  ·  ·  HOURLY MARK  ·  ·  ·</div>
        <div style={{ height: 18 }} />
        <GhostNum size={130}>15:00</GhostNum>
        <div style={{ height: 28 }} />
        <Waveform playing bars={36} height={80} color="var(--lcd-ink)" />
        <div style={{ height: 28 }} />
        <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 30, letterSpacing: 4, color: 'var(--lcd-ink)' }}>·BEEP·</div>
        <div style={{ height: 60 }} />
        <span className="phys-btn">DISMISS</span>
      </div>

      {/* red LED corner */}
      <div style={{
        position: 'absolute', top: 60, right: 24,
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--lcd-ink-dim)',
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--red-led)',
          boxShadow: '0 0 8px var(--red-led)',
          animation: 'blink 1s steps(2) infinite',
        }} />
        LIVE
      </div>
    </div>
  );
}

// ─── LOCK-SCREEN WIDGET (wild one) ─────────────────────────────────────
function ScreenLockWidget() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(150deg, #1a1d22 0%, #2a2e35 60%, #1a1d22 100%)',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--f-mono)',
    }}>
      {/* faux wallpaper noise */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08, background: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 4px)' }} />

      {/* time */}
      <div style={{ textAlign: 'center', paddingTop: 80, color: '#fff', fontWeight: 200 }}>
        <div style={{ fontFamily: '-apple-system', fontSize: 16, opacity: 0.8 }}>Monday, May 14</div>
        <div style={{ fontFamily: '-apple-system', fontSize: 96, fontWeight: 200, lineHeight: 1, letterSpacing: -3 }}>15:00</div>
      </div>

      {/* PIP widget */}
      <div style={{
        margin: '60px 18px 0',
        background: 'var(--lcd-bg)',
        borderRadius: 22,
        padding: '14px 16px',
        boxShadow: '0 12px 30px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <PIPLogo size={20} color="var(--lcd-ink)" />
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--lcd-ink-dim)' }}>HOURLY · ON</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <span className="eyebrow" style={{ color: 'var(--lcd-ink-dim)' }}>NEXT</span>
          <GhostNum size={42}>16:00</GhostNum>
          <span className="t-mono" style={{ fontSize: 12, letterSpacing: 1, color: 'var(--lcd-ink-dim)', marginLeft: 'auto' }}>IN 59:48</span>
        </div>
        <div style={{ position: 'relative', marginTop: 10 }}>
          <Waveform playing bars={24} height={20} />
        </div>
      </div>

      {/* 2 secondary widgets — minimal */}
      <div style={{ display: 'flex', gap: 10, margin: '14px 18px 0' }}>
        {['WEATHER', 'CALENDAR'].map(w => (
          <div key={w} style={{
            flex: 1, height: 72,
            background: 'rgba(60,60,68,0.55)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,.35)',
            fontSize: 10, letterSpacing: 2,
          }}>{w}</div>
        ))}
      </div>

      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(255,255,255,.7)',
      }} />
    </div>
  );
}

Object.assign(window, {
  ScreenHomeOn, ScreenHomeOff, ScreenFrequency, ScreenCustomHours,
  ScreenSound, ScreenSettings, ScreenStore,
  ScreenOnboard1, ScreenOnboard2, ScreenOnboard3,
  ScreenBeeping, ScreenLockWidget,
});
