// primitives.jsx — reusable LCD bits used across all screens.
// Loaded before screens.jsx; exposes everything on window.

// ───────────────────────────────────────────────
// PIPLogo — original wordmark (NOT a Casio mark)
// Bold dot-matrix "PIP" with a tiny "·)))" radiating from the I
// to evoke a beep without copying anyone's lockup.
// ───────────────────────────────────────────────
function PIPLogo({ size = 32, color, withBeep = true, style = {} }) {
  const c = color || 'var(--lcd-ink)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.16, ...style }}>
      <span
        className="t-pixel"
        style={{
          fontSize: size,
          letterSpacing: size * 0.04,
          lineHeight: 1,
          color: c,
          fontFamily: 'VT323, monospace',
        }}
      >
        PIP
      </span>
      {withBeep && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: size * 0.04, justifyContent: 'center' }}>
          <span style={{ width: size * 0.36, height: 2, background: c, opacity: 0.85 }} />
          <span style={{ width: size * 0.24, height: 2, background: c, opacity: 0.55, marginLeft: size * 0.12 }} />
          <span style={{ width: size * 0.12, height: 2, background: c, opacity: 0.30, marginLeft: size * 0.24 }} />
        </span>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────
// GhostNum — render numerals with LCD "ghost" segments under the active one.
// Uses 8 as the ghost (all segments lit) layered behind the real digit.
// ───────────────────────────────────────────────
function GhostNum({ children, size = 92, family = 'var(--f-dot)' }) {
  // Unwrap any React-element wrapping the literal text (the runtime's
  // text-edit component wraps static JSX text children, so plain
  // String(children) yields "[object Object]"). Walk the tree and collect
  // string/number nodes.
  const toText = (node) => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(toText).join('');
    if (node && node.props) return toText(node.props.children);
    return '';
  };
  const s = toText(children);
  return (
    <span style={{ display: 'inline-flex', lineHeight: 1, fontFamily: family, fontSize: size, fontVariationSettings: '"ROND" 100' }}>
      {s.split('').map((ch, i) => {
        if (ch === ':') {
          return (
            <span key={i} style={{ padding: '0 0.04em', color: 'var(--lcd-ink)' }} className="colon-blink">:</span>
          );
        }
        // digit with ghost 8 behind
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ color: 'var(--lcd-ghost)' }}>8</span>
            <span style={{ position: 'absolute', inset: 0, color: 'var(--lcd-ink)' }}>{ch}</span>
          </span>
        );
      })}
    </span>
  );
}

// ───────────────────────────────────────────────
// Battery indicator
// ───────────────────────────────────────────────
function Battery({ level = 4 /* of 4 */ }) {
  return (
    <span className="batt">
      <span className="batt-body">
        {[0,1,2,3].map(i => <span key={i} className={`batt-cell ${i < level ? '' : 'empty'}`} />)}
      </span>
      <span className="batt-tip" />
    </span>
  );
}

// ───────────────────────────────────────────────
// Big chunky physical toggle — F-91W mode-select feel
// On = ink-filled square slid right with ">" carved.
// ───────────────────────────────────────────────
function BigToggle({ on, label = 'BEEPS', sublabel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        position: 'relative',
        width: 200, height: 76,
        borderRadius: 6,
        background: 'var(--lcd-bg-deep)',
        border: '2px solid var(--lcd-ink)',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,.18)',
        display: 'flex',
        padding: 6,
      }}>
        {/* track labels */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 22px',
          fontFamily: 'var(--f-mono)', fontSize: 13, letterSpacing: 2,
          color: 'var(--lcd-ink-dim)',
        }}>
          <span style={{ opacity: on ? 1 : 0.3, color: on ? 'var(--lcd-bg)' : 'inherit', fontWeight: on ? 700 : 400, transition: 'all .2s' }}>ON</span>
          <span style={{ opacity: on ? 0.3 : 1, fontWeight: on ? 400 : 700, transition: 'all .2s' }}>OFF</span>
        </div>
        {/* slider knob */}
        <div style={{
          width: 92, height: '100%',
          background: 'var(--lcd-ink)',
          borderRadius: 3,
          marginLeft: on ? 0 : 96,
          transition: 'margin-left .25s cubic-bezier(.4,1.4,.6,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.3)',
          position: 'relative', zIndex: 1,
        }}>
          {/* grip lines */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[0,1,2,3,4].map(i => (
              <span key={i} style={{ width: 2, height: 22, background: 'var(--lcd-bg)', opacity: 0.55 }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: 3, color: 'var(--lcd-ink)' }}>
        {label}
        {sublabel && <div style={{ marginTop: 4, fontSize: 10, opacity: 0.6, letterSpacing: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Mini soft toggle (settings rows)
// ───────────────────────────────────────────────
function PixelToggle({ on }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 40, height: 20,
      border: '1.5px solid var(--lcd-ink)',
      borderRadius: 2,
      background: 'transparent',
      padding: 1,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 1, bottom: 1,
        width: 16,
        left: on ? 'calc(100% - 18px)' : 1,
        background: 'var(--lcd-ink)',
        transition: 'left .18s',
      }} />
    </span>
  );
}

// ───────────────────────────────────────────────
// Waveform bars
// ───────────────────────────────────────────────
function Waveform({ playing = true, bars = 22, height = 36, color, style = {} }) {
  // deterministic heights so it doesn't change across renders
  const seq = [42,72,30,86,55,28,68,40,92,50,22,78,38,60,82,34,54,70,26,80,46,64];
  return (
    <span
      className={playing ? 'wave-anim' : ''}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height, ...style }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            height: `${seq[i % seq.length]}%`,
            background: color || 'var(--lcd-ink)',
            animationDelay: `${(i * 0.07) % 0.9}s`,
          }}
        />
      ))}
    </span>
  );
}

// ───────────────────────────────────────────────
// Status strip (top of LCD screens) — battery, BLE, etc.
// ───────────────────────────────────────────────
function LCDStatusStrip({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px 6px',
      fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
      color: 'var(--lcd-ink-dim)',
      borderBottom: '1px dashed var(--lcd-ink-dim)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span>PIP·01</span>
        <span>♫ M-LOAD</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {children}
        <Battery level={3} />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Tab bar at bottom — the four sub-modes
// ───────────────────────────────────────────────
function TabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home',  label: 'HOME' },
    { id: 'freq',  label: 'FREQ' },
    { id: 'snd',   label: 'SOUND' },
    { id: 'set',   label: 'SET' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '8px 12px 28px',
      display: 'flex', gap: 0,
      borderTop: '1px solid var(--lcd-ink-dim)',
      background:
        'linear-gradient(0deg, rgba(0,0,0,.08), transparent 40%), var(--lcd-bg)',
      zIndex: 3,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          flex: 1, textAlign: 'center',
          fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: 2,
          color: 'var(--lcd-ink)',
          padding: '8px 0 6px',
          background: active === t.id ? 'var(--lcd-ink)' : 'transparent',
          // invert when active
          ...(active === t.id ? { color: 'var(--lcd-bg)' } : {}),
        }}>
          {t.label}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────
// Section header inside LCD screens
// ───────────────────────────────────────────────
function LCDSection({ title, right, children, style = {} }) {
  return (
    <div style={{ padding: '16px 18px 8px', ...style }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div className="eyebrow">{title}</div>
        {right && <div className="eyebrow" style={{ opacity: 0.8 }}>{right}</div>}
      </div>
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────
// SoundRow — single sound option, with mini waveform.
// ───────────────────────────────────────────────
function SoundRow({ name, length, selected, locked, free = true }) {
  return (
    <div className={`lcd-row ${selected ? 'sel' : ''}`}>
      <div style={{
        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid currentColor',
      }}>
        {selected
          ? <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 18 }}>✓</span>
          : locked
            ? <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>🔒</span>
            : <span style={{ fontFamily: 'var(--f-pixel)', fontSize: 20 }}>▶</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 22, letterSpacing: 1, lineHeight: 1 }}>{name}</div>
        <div className="row-meta" style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 1, marginTop: 4, color: 'var(--lcd-ink-dim)' }}>
          {length} · {free ? 'FREE' : 'PACK'}
        </div>
      </div>
      <Waveform
        playing={selected}
        bars={10}
        height={20}
        color={selected ? 'var(--lcd-bg)' : 'var(--lcd-ink)'}
      />
    </div>
  );
}

Object.assign(window, {
  PIPLogo, GhostNum, Battery, BigToggle, PixelToggle, Waveform,
  LCDStatusStrip, TabBar, LCDSection, SoundRow,
});
