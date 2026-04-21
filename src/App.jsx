import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useRoom } from './lib/useRoom.js'
import { useVoice } from './lib/useVoice.js'
import { useLobby } from './lib/useLobby.js'
import { useMatchmaking } from './lib/useMatchmaking.js'
import { isSupabaseConfigured } from './lib/supabase.js'
import { formatQuestion } from './data/questions.js'
import { HEART_CELLS, START_CELLS, TRACK_SIZE, WIN_DISTANCE, computeLudoAnalysis } from './lib/useRoom.js'
import { sfx, isMuted, setMuted, primeAudio } from './lib/sounds.js'
import {
  FloatingHearts,
  CoupleSilhouette,
  CupidArrow,
  HeartBurst,
  SparkleConfetti,
  BeatingHeart,
} from './components/Illustrations.jsx'

async function compressImage(file, maxDim = 480, quality = 0.65) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('read-failed'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('img-failed'))
    el.src = dataUrl
  })
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * ratio))
  const h = Math.max(1, Math.round(img.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

function StreamVideo({ stream, muted, mirror, className }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (stream) {
      el.srcObject = stream
      const p = el.play?.()
      if (p && p.catch) p.catch(() => {})
    } else {
      el.srcObject = null
    }
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}

function VideoCallPanel({ voice, partnerName }) {
  const {
    muted, cameraOn, status,
    localStream, remoteStream,
    toggleMute, toggleCamera, disable,
  } = voice
  const [minimized, setMinimized] = useState(false)

  const statusText = (() => {
    switch (status) {
      case 'requesting': return 'Asking permissions...'
      case 'waiting': return partnerName ? `Waiting for ${partnerName}...` : 'Waiting for partner...'
      case 'connecting': return 'Connecting...'
      case 'connected': return partnerName ? `On call with ${partnerName}` : 'Connected'
      case 'muted': return 'You are muted'
      case 'failed': return 'Call disconnected'
      default: return status
    }
  })()

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')

  return (
    <div className={`video-panel ${minimized ? 'minimized' : ''}`}>
      <div className="video-remote">
        {remoteStream ? (
          <StreamVideo stream={remoteStream} muted={false} className="remote-video" />
        ) : (
          <div className="video-placeholder">
            <div className="placeholder-glow" />
            <p>{statusText}</p>
          </div>
        )}
        {!hasRemoteVideo && remoteStream && (
          <div className="video-overlay">
            <p>{partnerName || 'Partner'} turned camera off</p>
          </div>
        )}
        {cameraOn && localStream && (
          <div className="video-local">
            <StreamVideo stream={localStream} muted mirror className="local-video" />
          </div>
        )}
        <div className="video-header">
          <span className="video-title">{partnerName || 'Video call'}</span>
          <button
            className="icon-btn"
            onClick={() => setMinimized((v) => !v)}
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '\u2922' : '\u2012'}
          </button>
        </div>
        <div className="video-controls">
          <button
            className={`round-btn ${muted ? 'danger' : ''}`}
            onClick={() => { sfx.click(); toggleMute() }}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '\uD83D\uDD07' : '\uD83C\uDFA4'}
          </button>
          <button
            className={`round-btn ${cameraOn ? '' : 'danger'}`}
            onClick={() => { sfx.click(); toggleCamera() }}
            title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {cameraOn ? '\uD83D\uDCF9' : '\uD83D\uDEAB'}
          </button>
          <button
            className="round-btn hangup"
            onClick={() => { sfx.click(); disable() }}
            title="End call"
          >
            {'\u260E'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VoiceControls({ voice, partnerName, highlight }) {
  const {
    enabled, hasVideo, status, muted, error, enable, disable, toggleMute, audioRef,
  } = voice

  const statusLabel = (() => {
    switch (status) {
      case 'idle': return 'Voice / video: OFF'
      case 'requesting': return 'Asking permissions...'
      case 'waiting': return partnerName ? `Waiting for ${partnerName}...` : 'Waiting for partner...'
      case 'connecting': return 'Connecting...'
      case 'connected': return partnerName ? `On call with ${partnerName}` : 'Connected'
      case 'muted': return 'You are muted'
      case 'denied': return 'Permission denied'
      case 'failed': return 'Call failed'
      default: return status
    }
  })()

  const dotClass = (() => {
    if (status === 'connected' || status === 'muted') return 'online'
    if (status === 'failed' || status === 'denied') return 'error'
    if (status === 'idle') return 'dim'
    return 'offline'
  })()

  const attention = highlight && !enabled

  if (enabled && hasVideo) {
    return (
      <>
        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
        <VideoCallPanel voice={voice} partnerName={partnerName} />
      </>
    )
  }

  return (
    <div className={`voice-bar ${attention ? 'pulse' : ''}`}>
      <audio ref={audioRef} autoPlay playsInline />
      <div className="voice-status">
        <span className="voice-icon" aria-hidden="true">
          {enabled ? (muted ? '\uD83D\uDD07' : '\uD83C\uDFA4') : '\uD83C\uDFA4'}
        </span>
        <span className={`dot ${dotClass}`} />
        <span className="voice-label">{statusLabel}</span>
      </div>
      <div className="voice-actions">
        {!enabled ? (
          <>
            <button
              className="cta small voice-enable"
              onClick={() => { sfx.click(); enable({ video: false }) }}
              disabled={status === 'requesting'}
              title="Audio only"
            >
              <span className="mic-glyph" aria-hidden="true">{'\uD83C\uDFA4'}</span>
              Voice
            </button>
            <button
              className="cta small video-enable"
              onClick={() => { sfx.click(); enable({ video: true }) }}
              disabled={status === 'requesting'}
              title="Audio + video"
            >
              <span className="mic-glyph" aria-hidden="true">{'\uD83D\uDCF9'}</span>
              Video
            </button>
          </>
        ) : (
          <>
            <button
              className={muted ? 'cta small' : 'ghost small'}
              onClick={() => { sfx.click(); toggleMute() }}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              className="ghost small"
              onClick={() => { sfx.click(); disable() }}
            >
              End
            </button>
          </>
        )}
      </div>
      {error && status === 'denied' && (
        <p className="voice-error">
          Browser blocked camera / mic. Enable it in your browser's site settings and try again.
        </p>
      )}
      {error && status === 'failed' && (
        <p className="voice-error">Could not connect. Check your network and try again.</p>
      )}
    </div>
  )
}

function ChatPanel({ state, role, me, dispatch }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)
  const listRef = useRef(null)
  const messages = state.chat || []
  const lastSeenRef = useRef(0)

  useEffect(() => {
    if (open) {
      setUnread(0)
      lastSeenRef.current = messages.length
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    } else {
      const newMsgs = messages.slice(lastSeenRef.current).filter((m) => m.from !== role)
      if (newMsgs.length) setUnread((u) => u + newMsgs.length)
      lastSeenRef.current = messages.length
    }
  }, [messages, open, role])

  const send = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    dispatch({
      type: 'SEND_CHAT',
      who: role,
      fromName: me?.name || (role === 'host' ? 'Host' : 'Guest'),
      text: trimmed,
    })
    setText('')
  }

  return (
    <>
      <button
        className={`chat-fab ${unread ? 'has-unread' : ''}`}
        onClick={() => { sfx.click(); setOpen((v) => !v) }}
        aria-label="Chat"
      >
        {'\uD83D\uDCAC'}
        {unread > 0 && <span className="chat-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Chat</span>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">{'\u2715'}</button>
          </div>
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && (
              <p className="chat-empty">Say hi! Messages are cleared when the room ends.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.from === role ? 'mine' : 'theirs'}`}>
                {m.from !== role && <div className="chat-from">{m.fromName}</div>}
                <div className="chat-text">{m.text}</div>
              </div>
            ))}
          </div>
          <form className="chat-form" onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              autoFocus
            />
            <button type="submit" className="cta small" disabled={!text.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  )
}

function MissingConfigScreen() {
  return (
    <main className="app-shell">
      <div className="glow-bg" aria-hidden="true" />
      <section className="panel">
        <header className="panel-header">
          <h1>Setup needed</h1>
          <p className="tagline">This deployment is missing its Supabase keys.</p>
        </header>
        <p className="subtle">
          Add these environment variables in your host (Vercel: Settings -&gt;
          Environment Variables), then redeploy without build cache:
        </p>
        <pre className="env-block">
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
        </pre>
        <p className="subtle">
          Vite bakes VITE_* variables into the bundle at build time, so they
          must exist when the build runs.
        </p>
      </section>
    </main>
  )
}

function AgeGateModal({ onAccept, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2>18+ Check</h2>
        <p>
          Stranger matching pairs you with someone you don't know. The game includes
          flirty and spicy prompts. You must be 18 or older to continue.
        </p>
        <ul className="rules-list">
          <li>Never share personal info (full name, address, money, links).</li>
          <li>Use the Skip button anytime to end a match.</li>
          <li>If someone makes you uncomfortable, tap Block + Skip.</li>
          <li>Don't expect real-name introductions here. Use a nickname.</li>
        </ul>
        <div className="modal-actions">
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button
            className="cta"
            onClick={() => {
              try { localStorage.setItem('love_swap_18plus', '1') } catch (e) { void e }
              onAccept()
            }}
          >
            I am 18+ and agree
          </button>
        </div>
      </div>
    </div>
  )
}

function PublicRoomsList({ rooms, onJoin, nickname, connecting }) {
  const list = rooms
    .filter((r) => !r.code || r.code.length)
    .sort((a, b) => (b.seenAt || 0) - (a.seenAt || 0))

  if (!list.length) {
    return (
      <div className="public-empty">
        <div className="spinner" />
        <p>No public rooms right now. Create one, or check back in a moment.</p>
      </div>
    )
  }

  return (
    <div className="public-list">
      {list.map((r) => (
        <div key={r.code} className="public-room">
          <div className="pr-main">
            <div className="pr-host">{r.hostName || 'Host'}</div>
            <div className="pr-meta">
              <span className="badge">{r.mode}</span>
              <span className="badge">spice {r.spice}</span>
              <span className="badge dim">{r.gameType === 'ludo' ? 'Love Ludo' : 'Questions'}</span>
            </div>
          </div>
          <button
            className="cta small"
            disabled={!nickname.trim() || connecting}
            onClick={() => {
              sfx.click()
              onJoin(nickname, r.code)
            }}
          >
            Join
          </button>
        </div>
      ))}
    </div>
  )
}

function MenuScreen({
  onCreate,
  onJoin,
  onStartStranger,
  connecting,
  error,
  publicRooms,
  matchStatus,
  onStopMatch,
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [tab, setTab] = useState('create')
  const [showAgeGate, setShowAgeGate] = useState(false)
  const [strangerNickname, setStrangerNickname] = useState('')

  const confirmStranger = () => {
    if (!strangerNickname.trim()) return
    let ageOk = false
    try { ageOk = localStorage.getItem('love_swap_18plus') === '1' } catch { ageOk = false }
    if (!ageOk) {
      setShowAgeGate(true)
      return
    }
    primeAudio()
    sfx.lock()
    onStartStranger(strangerNickname.trim())
  }

  return (
    <section className="panel has-illus">
      <FloatingHearts count={10} seed={1} />
      <header className="panel-header with-illus">
        <CoupleSilhouette size={110} />
        <h1>Love Swap</h1>
        <p className="tagline">Play private with your partner, or meet someone new.</p>
      </header>

      <div className="tabs tabs-wrap">
        <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')}>Create</button>
        <button className={tab === 'join' ? 'tab active' : 'tab'} onClick={() => setTab('join')}>Join by code</button>
        <button className={tab === 'public' ? 'tab active' : 'tab'} onClick={() => setTab('public')}>Public rooms</button>
        <button className={tab === 'stranger' ? 'tab active' : 'tab'} onClick={() => setTab('stranger')}>Stranger match</button>
      </div>

      {tab === 'create' && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            primeAudio()
            sfx.lock()
            onCreate(name, { visibility })
          }}
        >
          <label>
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How your partner knows you"
              required
              maxLength={24}
            />
          </label>
          <div className="visibility-row">
            <button
              type="button"
              className={`vis-card ${visibility === 'private' ? 'selected' : ''}`}
              onClick={() => setVisibility('private')}
            >
              <div className="vis-icon">{'\uD83D\uDD12'}</div>
              <div className="vis-title">Private</div>
              <div className="vis-desc">Only someone with your code can join.</div>
            </button>
            <button
              type="button"
              className={`vis-card ${visibility === 'public' ? 'selected' : ''}`}
              onClick={() => setVisibility('public')}
            >
              <div className="vis-icon">{'\uD83C\uDF10'}</div>
              <div className="vis-title">Public</div>
              <div className="vis-desc">Listed on the Public rooms tab for anyone to join.</div>
            </button>
          </div>
          <button type="submit" className="cta" disabled={connecting || !name.trim()}>
            {connecting ? 'Creating...' : 'Create room'}
          </button>
          <p className="subtle">
            {visibility === 'public'
              ? 'Anyone can see and join your room until someone pairs up with you.'
              : 'You will get a short room code to share.'}
          </p>
        </form>
      )}

      {tab === 'join' && (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            primeAudio()
            sfx.lock()
            onJoin(name, code)
          }}
        >
          <label>
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How your partner knows you"
              required
              maxLength={24}
            />
          </label>
          <label>
            Room code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7X2M"
              required
              maxLength={5}
              className="room-code-input"
            />
          </label>
          <button type="submit" className="cta" disabled={connecting}>
            {connecting ? 'Joining...' : 'Join room'}
          </button>
        </form>
      )}

      {tab === 'public' && (
        <div className="form-grid">
          <label>
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nickname"
              maxLength={24}
            />
          </label>
          <PublicRoomsList
            rooms={publicRooms}
            onJoin={onJoin}
            nickname={name}
            connecting={connecting}
          />
          <p className="subtle">
            Listings refresh every few seconds. When a host gets a partner, their room disappears.
          </p>
        </div>
      )}

      {tab === 'stranger' && (
        <div className="form-grid">
          <p className="subtle">
            Get matched with a random person. You'll land in a full Love Swap room together
            with voice, video, and chat.
          </p>
          <label>
            Nickname (not your real name)
            <input
              value={strangerNickname}
              onChange={(e) => setStrangerNickname(e.target.value)}
              placeholder="How strangers see you"
              maxLength={20}
            />
          </label>
          {matchStatus === 'idle' || matchStatus === 'failed' ? (
            <button
              className="cta"
              onClick={confirmStranger}
              disabled={!strangerNickname.trim()}
            >
              {'\uD83C\uDFB2'} Find a stranger
            </button>
          ) : (
            <div className="matchmaking-status">
              <CupidArrow size={90} />
              <div>
                <strong>
                  {matchStatus === 'searching' && 'Looking for someone...'}
                  {matchStatus === 'pairing' && 'Found someone! Pairing...'}
                  {matchStatus === 'matched' && 'Matched! Starting room...'}
                </strong>
                <p className="subtle">This usually takes a few seconds.</p>
              </div>
              <button className="ghost small" onClick={onStopMatch}>Cancel</button>
            </div>
          )}
          {matchStatus === 'failed' && (
            <p className="error">Matching failed. Try again.</p>
          )}
          <p className="voice-error">
            Safety: never share personal info. Skip / Block anyone who makes you uncomfortable.
          </p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {showAgeGate && (
        <AgeGateModal
          onAccept={() => {
            setShowAgeGate(false)
            primeAudio()
            sfx.lock()
            onStartStranger(strangerNickname.trim())
          }}
          onCancel={() => setShowAgeGate(false)}
        />
      )}
    </section>
  )
}

function WaitingForPartnerScreen({ roomCode, onLeave, partnerOnline, visibility }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
    } catch (e) {
      void e
    }
  }

  const isPublic = visibility === 'public'
  const isStranger = visibility === 'stranger'

  return (
    <section className="panel has-illus">
      <FloatingHearts count={8} seed={3} />
      <header className="panel-header with-illus">
        {isStranger ? <CupidArrow size={90} /> : <BeatingHeart size={40} />}
        <h1>{isStranger ? 'Finding a stranger...' : 'Share your code'}</h1>
        <p className="tagline">
          {isStranger
            ? 'Hang tight, pairing you up.'
            : isPublic
              ? 'Your room is listed publicly. Anyone can join.'
              : 'Send this to your partner. You both play from any device.'}
        </p>
      </header>

      <div className="code-display">
        <div className="code-value">{roomCode}</div>
        <button className="ghost small" onClick={copy}>
          Copy code
        </button>
      </div>

      {isPublic && (
        <div className="status-row">
          <span className="badge">Public</span>
          <span className="subtle">Listed in the Public rooms tab until someone joins.</span>
        </div>
      )}

      <div className="status-row">
        <span className={`dot ${partnerOnline ? 'online' : 'offline'}`} />
        <span>{partnerOnline ? 'Partner connected' : 'Waiting for partner to join...'}</span>
      </div>

      <button className="ghost" onClick={onLeave}>
        Cancel room
      </button>
    </section>
  )
}

function ConnectingScreen({ roomCode, onLeave }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Connecting...</h1>
        <p className="tagline">Joining room {roomCode}</p>
      </header>
      <div className="status-row">
        <span className="dot offline" />
        <span>Waiting for host...</span>
      </div>
      <p className="subtle">
        If this takes more than a few seconds, double-check the room code with your partner.
      </p>
      <button className="ghost" onClick={onLeave}>
        Cancel
      </button>
    </section>
  )
}

function LobbyScreen({ role, state, dispatch, me, partner, roomCode, onLeave }) {
  const isHost = role === 'host'
  const config = state.config

  const update = (patch) => {
    if (!isHost) return
    dispatch({ type: 'UPDATE_CONFIG', config: patch })
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Ready to play</h1>
        <p className="tagline">
          Room <strong>{roomCode}</strong> | {me?.name} and {partner?.name}
        </p>
      </header>

      <div className="couple-block">
        <h3>Choose your game</h3>
        <div className="game-type-grid">
          <button
            type="button"
            className={`game-type-card ${state.gameType === 'questions' ? 'selected' : ''}`}
            onClick={() => isHost && dispatch({ type: 'SET_GAME_TYPE', gameType: 'questions' })}
            disabled={!isHost}
          >
            <div className="gt-icon">{'♥'}</div>
            <div className="gt-title">Know Me Quiz</div>
            <div className="gt-desc">Answer and guess what your partner said.</div>
          </button>
          <button
            type="button"
            className={`game-type-card ${state.gameType === 'ludo' ? 'selected' : ''}`}
            onClick={() => isHost && dispatch({ type: 'SET_GAME_TYPE', gameType: 'ludo' })}
            disabled={!isHost}
          >
            <div className="gt-icon">{'◆'}</div>
            <div className="gt-title">Love Ludo</div>
            <div className="gt-desc">Race around the heart loop with flirty prompts.</div>
          </button>
        </div>

        <h3>Settings</h3>
        <div className="two-col">
          <label>
            Mode
            <select
              value={config.mode}
              onChange={(e) => update({ mode: e.target.value })}
              disabled={!isHost}
            >
              <option value="fun">Fun</option>
              <option value="romantic">Romantic</option>
              <option value="flirty">Flirty</option>
            </select>
          </label>
          {state.gameType === 'questions' && (
            <label>
              Rounds
              <select
                value={config.rounds}
                onChange={(e) => update({ rounds: Number(e.target.value) })}
                disabled={!isHost}
              >
                <option value={3}>3 (quick)</option>
                <option value={5}>5 (classic)</option>
                <option value={7}>7</option>
                <option value={10}>10 (marathon)</option>
              </select>
            </label>
          )}
        </div>

        <label className="slider-label">
          <span>Spice level: {config.spice} / 5</span>
          <input
            type="range"
            min="1"
            max="5"
            value={config.spice}
            onChange={(e) => update({ spice: Number(e.target.value) })}
            disabled={!isHost}
          />
          <small className="subtle">1 = tame, 5 = spicy.</small>
        </label>

        {state.gameType === 'questions' && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={config.doublePoints}
              onChange={(e) => update({ doublePoints: e.target.checked })}
              disabled={!isHost}
            />
            Random double-points round
          </label>
        )}
        {state.gameType === 'ludo' && (
          <p className="subtle">
            First to complete a full lap wins. Landing on a heart cell gives a flirty prompt; nail it together for bonus moves. Catch your partner to send them home.
          </p>
        )}
      </div>

      {isHost ? (
        <button
          className="cta"
          onClick={() => {
            sfx.lock()
            dispatch({ type: 'START_GAME' })
          }}
        >
          {state.gameType === 'ludo' ? 'Start Love Ludo' : 'Start game'}
        </button>
      ) : (
        <p className="subtle center">{partner?.name} is setting things up...</p>
      )}

      <button className="ghost" onClick={onLeave}>
        Leave room
      </button>
    </section>
  )
}

function TurnHeader({ state, me, partner, role }) {
  const turn = state.turns[state.turnIndex]
  const myScore = state.scores[role]
  const partnerScore = state.scores[role === 'host' ? 'guest' : 'host']
  return (
    <div className="turn-header">
      <div className="round-chip">
        Round {turn.round} of {state.turns.length}
      </div>
      <div className="scoreline">
        <span>{me?.name}: {myScore}</span>
        <span className="divider">-</span>
        <span>{partner?.name}: {partnerScore}</span>
      </div>
      {turn.multiplier > 1 && (
        <div className="flags">
          <span className="flag flag-double">Double points 2x</span>
        </div>
      )}
    </div>
  )
}

function OptionPicker({ options, value, onChange, formatLabel }) {
  return (
    <div className="option-grid">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`option-btn ${value === opt ? 'selected' : ''}`}
          onClick={() => {
            sfx.click()
            onChange(opt)
          }}
        >
          {formatLabel ? formatLabel(opt) : opt}
        </button>
      ))}
    </div>
  )
}

function AnswerScreen({ state, role, dispatch, me, partner }) {
  const turn = state.turns[state.turnIndex]
  const iAmResponder = turn.responder === role
  const isChoice = turn.question.type === 'choice'
  const [text, setText] = useState('')
  const [hidden, setHidden] = useState(true)

  const responderName = iAmResponder ? me?.name : partner?.name
  const partnerName = iAmResponder ? partner?.name : me?.name
  const fmt = (t) =>
    formatQuestion(t, { viewerIsResponder: iAmResponder, responderName, partnerName })
  const questionText = fmt(turn.question.text)

  if (!iAmResponder) {
    return (
      <section className="panel">
        <TurnHeader state={state} me={me} partner={partner} role={role} />
        <div className="category-chip">{turn.question.category}</div>
        <h2 className="question">{questionText}</h2>
        <div className="waiting-card">
          <div className="spinner" />
          <p>Waiting for {partner?.name} to answer...</p>
        </div>
      </section>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sfx.lock()
    dispatch({ type: 'SUBMIT_ANSWER', text: text.trim() })
    setText('')
  }

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <div className="category-chip">{turn.question.category}</div>
      <h2 className="question">{questionText}</h2>
      <p className="subtle">
        {isChoice
          ? `Pick your honest answer. ${partner?.name} will try to guess which one you chose.`
          : `Type honestly. ${partner?.name} will try to guess what you say.`}
      </p>

      {isChoice ? (
        <form className="form-grid" onSubmit={submit}>
          <OptionPicker
            options={turn.question.options}
            value={text}
            onChange={setText}
            formatLabel={fmt}
          />
          <button type="submit" className="cta" disabled={!text}>
            Lock answer
          </button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <label>
            Your private answer
            <input
              autoFocus
              type={hidden ? 'password' : 'text'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type here..."
              required
              maxLength={200}
            />
          </label>
          <div className="toggle-row compact">
            <button type="button" className="ghost" onClick={() => setHidden((v) => !v)}>
              {hidden ? 'Show letters' : 'Hide letters'}
            </button>
            <button type="submit" className="cta">
              Lock answer
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function GuessScreen({ state, role, dispatch, me, partner }) {
  const turn = state.turns[state.turnIndex]
  const iAmGuesser = turn.responder !== role
  const isChoice = turn.question.type === 'choice'
  const [text, setText] = useState('')

  const responderName = iAmGuesser ? partner?.name : me?.name
  const partnerName = iAmGuesser ? me?.name : partner?.name
  const fmt = (t) =>
    formatQuestion(t, { viewerIsResponder: !iAmGuesser, responderName, partnerName })
  const questionText = fmt(turn.question.text)

  if (!iAmGuesser) {
    return (
      <section className="panel">
        <TurnHeader state={state} me={me} partner={partner} role={role} />
        <div className="category-chip">{turn.question.category}</div>
        <h2 className="question">{questionText}</h2>
        <div className="waiting-card">
          <div className="spinner" />
          <p>Answer locked. Waiting for {partner?.name} to guess...</p>
        </div>
      </section>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sfx.lock()
    dispatch({ type: 'SUBMIT_GUESS', text: text.trim() })
    setText('')
  }

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <div className="category-chip">{turn.question.category}</div>
      <h2 className="question">{questionText}</h2>
      <p className="subtle">
        {isChoice
          ? `${partner?.name} picked one. Which do you think they chose?`
          : `${partner?.name} has answered. What do you think they said?`}
      </p>

      {isChoice ? (
        <form className="form-grid" onSubmit={submit}>
          <OptionPicker
            options={turn.question.options}
            value={text}
            onChange={setText}
            formatLabel={fmt}
          />
          <button type="submit" className="cta" disabled={!text}>
            Lock guess and reveal
          </button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={submit}>
          <label>
            Your guess
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`What did ${partner?.name} say?`}
              required
              maxLength={200}
            />
          </label>
          <button type="submit" className="cta">
            Lock guess and reveal
          </button>
        </form>
      )}
    </section>
  )
}

function ChoiceRevealGrid({ options, answer, guess, responderName, guesserName, formatLabel }) {
  return (
    <div className="choice-reveal">
      {options.map((opt) => {
        const isAnswer = opt === answer
        const isGuess = opt === guess
        const classes = ['choice-pill']
        if (isAnswer) classes.push('is-answer')
        if (isGuess) classes.push('is-guess')
        if (isAnswer && isGuess) classes.push('is-match')
        return (
          <div key={opt} className={classes.join(' ')}>
            <span className="choice-text">{formatLabel ? formatLabel(opt) : opt}</span>
            <span className="choice-tags">
              {isAnswer && <span className="choice-tag tag-answer">{responderName}</span>}
              {isGuess && <span className="choice-tag tag-guess">{guesserName}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RevealScreen({ state, role, dispatch, me, partner }) {
  const [flipped, setFlipped] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFlipped(true), 350)
    return () => clearTimeout(id)
  }, [])

  const similarity = state.similarity
  useEffect(() => {
    const t = setTimeout(() => {
      if (similarity >= 0.8) sfx.match()
      else if (similarity >= 0.45) sfx.close()
      else sfx.miss()
    }, 600)
    return () => clearTimeout(t)
  }, [similarity])

  const turn = state.turns[state.turnIndex]
  const isHost = role === 'host'
  const isChoice = turn.question.type === 'choice'
  const responderName = turn.responder === 'host' ? state.players.host?.name : state.players.guest?.name
  const guesserName = turn.responder === 'host' ? state.players.guest?.name : state.players.host?.name
  const isExactMatch = state.answerText === state.guessText
  const viewerIsResponder = turn.responder === role
  const partnerName = viewerIsResponder ? guesserName : responderName
  const fmt = (t) =>
    formatQuestion(t, { viewerIsResponder, responderName, partnerName })
  const questionText = fmt(turn.question.text)

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <h2 className="question">{questionText}</h2>

      {isChoice ? (
        <ChoiceRevealGrid
          options={turn.question.options}
          answer={state.answerText}
          guess={state.guessText}
          responderName={responderName}
          guesserName={guesserName}
          formatLabel={fmt}
        />
      ) : (
        <div className="reveal-grid">
          <div className={`flip-card ${flipped ? 'flipped' : ''}`}>
            <div className="flip-inner">
              <div className="flip-face flip-front">
                <p className="mini-label">{responderName} said</p>
                <p className="mini-hint">revealing...</p>
              </div>
              <div className="flip-face flip-back">
                <p className="mini-label">{responderName}</p>
                <p className="reveal-text">{state.answerText}</p>
              </div>
            </div>
          </div>
          <div className="flip-card static">
            <div className="flip-face solo">
              <p className="mini-label">{guesserName} guessed</p>
              <p className="reveal-text">{state.guessText}</p>
            </div>
          </div>
        </div>
      )}

      {isChoice && isExactMatch && (
        <div className="match-badge">Exact match</div>
      )}

      <div className="score-line">
        {!isChoice && (
          <p>Similarity: <strong>{Math.round(state.similarity * 100)}%</strong></p>
        )}
        <p>
          Points: <strong>+{state.points}</strong>
          {turn.multiplier > 1 && <span className="mult-note"> (2x applied)</span>}
        </p>
      </div>

      <p className="reaction">{state.reaction}</p>

      {isHost ? (
        <button className="cta" onClick={() => dispatch({ type: 'NEXT_TURN' })}>
          {state.turnIndex + 1 >= state.turns.length ? 'See final results' : 'Next turn'}
        </button>
      ) : (
        <p className="subtle center">Waiting for {partner?.name} to continue...</p>
      )}
    </section>
  )
}

function FinalScreen({ state, role, dispatch, me, partner, onLeave }) {
  const isHost = role === 'host'
  const myScore = state.scores[role]
  const partnerScore = state.scores[role === 'host' ? 'guest' : 'host']
  const combinedMax = state.turns.length * 2
  const combinedAccuracy = Math.round(((myScore + partnerScore) / combinedMax) * 100)

  const bestReader = useMemo(() => {
    const totals = { host: { sum: 0, count: 0 }, guest: { sum: 0, count: 0 } }
    Object.values(state.results).forEach((r) => {
      totals[r.guesserKey].sum += r.similarity
      totals[r.guesserKey].count += 1
    })
    const h = totals.host.count ? totals.host.sum / totals.host.count : 0
    const g = totals.guest.count ? totals.guest.sum / totals.guest.count : 0
    if (h === g) return null
    return h > g ? 'host' : 'guest'
  }, [state.results])

  const mostUnexpected = useMemo(() => {
    const entries = Object.values(state.results)
    if (!entries.length) return null
    return entries.slice().sort((a, b) => a.similarity - b.similarity)[0]
  }, [state.results])

  const bestReaderName = bestReader
    ? bestReader === 'host'
      ? state.players.host?.name
      : state.players.guest?.name
    : null

  let verdict
  if (myScore > partnerScore) verdict = `You won, ${me?.name}`
  else if (myScore < partnerScore) verdict = `${partner?.name} out-read you this time`
  else verdict = "A perfect tie"

  const iWonFinal = myScore > partnerScore
  return (
    <section className="panel final-panel has-illus">
      {iWonFinal && <SparkleConfetti count={24} />}
      <h1 className="final-title">
        {iWonFinal && <BeatingHeart size={32} />} {verdict}
      </h1>
      <p className="tagline">Couple accuracy: {combinedAccuracy}%</p>

      <div className="scoreboard-grid big">
        <div className="score-card couple-a">
          <p className="mini-label">{me?.name}</p>
          <p className="big-score">{myScore}</p>
        </div>
        <div className="score-card couple-b">
          <p className="mini-label">{partner?.name}</p>
          <p className="big-score">{partnerScore}</p>
        </div>
      </div>

      <div className="award-list">
        <div className="award">
          <p className="mini-label">Best mind reader</p>
          <p className="award-name">{bestReaderName ?? 'Tie'}</p>
        </div>
        {mostUnexpected && (
          <div className="award">
            <p className="mini-label">Most unexpected answer</p>
            <p className="award-name">
              {mostUnexpected.responder === 'host'
                ? state.players.host?.name
                : state.players.guest?.name}
            </p>
            <p className="subtle">"{mostUnexpected.answer}"</p>
          </div>
        )}
      </div>

      {isHost ? (
        <button className="cta" onClick={() => dispatch({ type: 'RESTART' })}>
          Play again
        </button>
      ) : (
        <p className="subtle center">Waiting for {partner?.name} to start a new game...</p>
      )}

      <button className="ghost" onClick={onLeave}>
        Leave room
      </button>
    </section>
  )
}

// ---------- LOVE LUDO ----------

// 7x7 grid perimeter traversal mapping cellIndex -> (row, col)
function cellCoords(i) {
  if (i <= 6) return { row: 0, col: i } // top: 0..6
  if (i <= 11) return { row: i - 6, col: 6 } // right: 7..11
  if (i <= 18) return { row: 6, col: 18 - i } // bottom: 12..18
  return { row: 24 - i, col: 0 } // left: 19..23
}

// Animate displayed token positions so they step cell-by-cell toward the
// authoritative game positions after a dice roll or heart bonus move.
// Captures (which reset a token back to its start) snap immediately.
function useAnimatedPositions(realPositions, stepDelay = 180) {
  const [display, setDisplay] = useState(realPositions)
  const displayRef = useRef(realPositions)
  const timersRef = useRef({ host: null, guest: null })
  const [animating, setAnimating] = useState({ host: false, guest: false })

  useEffect(() => {
    const runStep = (who) => {
      const target = realPositions[who]
      const current = displayRef.current[who]
      if (current === target) {
        setAnimating((a) => (a[who] ? { ...a, [who]: false } : a))
        return
      }
      let forward = target - current
      if (forward < 0) forward += TRACK_SIZE
      // 0 or large jump -> capture reset or unusual; snap.
      if (forward === 0 || forward > 9) {
        displayRef.current = { ...displayRef.current, [who]: target }
        setDisplay({ ...displayRef.current })
        setAnimating((a) => ({ ...a, [who]: false }))
        return
      }
      setAnimating((a) => ({ ...a, [who]: true }))
      const next = (current + 1) % TRACK_SIZE
      displayRef.current = { ...displayRef.current, [who]: next }
      setDisplay({ ...displayRef.current })
      try { sfx.tick() } catch (e) { void e }
      if (next === target) {
        setAnimating((a) => ({ ...a, [who]: false }))
        return
      }
      timersRef.current[who] = setTimeout(() => runStep(who), stepDelay)
    }

    ;['host', 'guest'].forEach((who) => {
      if (timersRef.current[who]) {
        clearTimeout(timersRef.current[who])
        timersRef.current[who] = null
      }
      if (realPositions[who] !== displayRef.current[who]) {
        timersRef.current[who] = setTimeout(() => runStep(who), 60)
      }
    })
  }, [realPositions.host, realPositions.guest, stepDelay])

  useEffect(() => {
    const t = timersRef.current
    return () => {
      if (t.host) clearTimeout(t.host)
      if (t.guest) clearTimeout(t.guest)
    }
  }, [])

  return { display, animating }
}

function shortName(name, fallback) {
  const n = (name || '').trim()
  if (!n) return fallback
  return n.slice(0, 3).toUpperCase()
}

function LudoBoard({ ludo, hostName, guestName, displayPositions, movingHost, movingGuest }) {
  const hostTag = shortName(hostName, 'P1')
  const guestTag = shortName(guestName, 'P2')
  const positions = displayPositions || ludo.positions
  const cells = []
  for (let i = 0; i < TRACK_SIZE; i += 1) {
    const { row, col } = cellCoords(i)
    const isHeart = HEART_CELLS.includes(i)
    const isHostStart = i === START_CELLS.host
    const isGuestStart = i === START_CELLS.guest
    const hasHost = positions.host === i
    const hasGuest = positions.guest === i

    const classes = ['ludo-cell']
    if (isHeart) classes.push('heart')
    if (isHostStart) classes.push('start-host')
    if (isGuestStart) classes.push('start-guest')
    if ((hasHost && movingHost) || (hasGuest && movingGuest)) classes.push('is-landing')

    cells.push(
      <div
        key={i}
        className={classes.join(' ')}
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
        title={
          isHeart
            ? 'Heart cell (flirty prompt)'
            : isHostStart
              ? `${hostName || 'Host'} start`
              : isGuestStart
                ? `${guestName || 'Guest'} start`
                : `Cell ${i}`
        }
      >
        <span className="ludo-cell-num">{i}</span>
        {isHeart && <span className="ludo-cell-mark">♥</span>}
        {isHostStart && !isHeart && <span className="ludo-cell-mark name host-tag">{hostTag}</span>}
        {isGuestStart && !isHeart && <span className="ludo-cell-mark name guest-tag">{guestTag}</span>}
        <div className="ludo-tokens">
          {hasHost && (
            <div
              className={`ludo-token host ${movingHost ? 'is-hopping' : ''}`}
              title={hostName || 'Host'}
            />
          )}
          {hasGuest && (
            <div
              className={`ludo-token guest ${movingGuest ? 'is-hopping' : ''}`}
              title={guestName || 'Guest'}
            />
          )}
        </div>
      </div>,
    )
  }

  return (
    <div className="ludo-board-wrap">
      <div className="ludo-board">
        {cells}
        <div className="ludo-center">
          <div className="ludo-center-heart">♥</div>
          <div className="ludo-legend">
            <div className="legend-row"><span className="chip host" /> {hostName || 'Host'}</div>
            <div className="legend-row"><span className="chip guest" /> {guestName || 'Guest'}</div>
            <div className="legend-row muted">♥ heart prompt</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiceFace({ n }) {
  // 3x3 grid of dot positions for each dice number
  const positions = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }
  const cells = positions[n] || []
  return (
    <div className="dice-face-grid">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`dice-dot ${cells.includes(i) ? 'on' : ''}`}
        />
      ))}
    </div>
  )
}

function Dice({ value }) {
  const [displayValue, setDisplayValue] = useState(value ?? 1)
  const [rolling, setRolling] = useState(false)
  const prevValue = useRef(value)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (value === prevValue.current) return
    prevValue.current = value
    if (value == null) {
      setDisplayValue(1)
      return
    }

    if (intervalRef.current) clearInterval(intervalRef.current)
    setRolling(true)
    sfx.diceRoll()

    let ticks = 0
    const maxTicks = 11
    intervalRef.current = setInterval(() => {
      ticks += 1
      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setDisplayValue(value)
        setRolling(false)
        sfx.diceLand()
      } else {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
      }
    }, 70)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [value])

  return (
    <div className={`dice-box ${rolling ? 'rolling' : ''}`}>
      <div className="dice">
        <DiceFace n={displayValue} />
      </div>
    </div>
  )
}

function LudoCaptureEvent({ ludo, role, me, partner, dispatch }) {
  const event = ludo.event
  const dare = typeof event.dare === 'string' ? { text: event.dare, kind: 'voice' } : event.dare
  const youWereCaptured = event.captured === role
  const youDidCapture = event.by === role
  const iAcked = Boolean(event.acked?.[role])
  const isPhoto = dare.kind === 'photo'
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    setUploading(true)
    try {
      const dataUrl = await compressImage(f, 480, 0.62)
      if (dataUrl.length > 180_000) {
        const smaller = await compressImage(f, 360, 0.55)
        if (smaller.length > 180_000) {
          setErr('Photo too large, try a different one.')
          return
        }
        dispatch({ type: 'LUDO_CAPTURE_PHOTO', who: role, dataUrl: smaller })
      } else {
        dispatch({ type: 'LUDO_CAPTURE_PHOTO', who: role, dataUrl })
      }
      sfx.lock()
    } catch {
      setErr('Could not read that photo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const mustWaitForPhoto = isPhoto && youWereCaptured && !event.photo

  return (
    <div className="ludo-event capture">
      <h2>{youDidCapture ? 'Gotcha!' : 'You got caught'}</h2>
      {youDidCapture ? (
        <p>You landed on {partner?.name}. They head back to start and you get an extra roll.</p>
      ) : (
        <p>{partner?.name} caught your token. Your dare:</p>
      )}

      <div className={`dare-chip ${dare.kind}`}>
        <span className="dare-kind-icon">{dare.kind === 'photo' ? '📸' : '🎤'}</span>
        <span className="dare-kind-label">{dare.kind === 'photo' ? 'Photo dare' : 'Voice dare'}</span>
      </div>
      <p className="dare-text">{dare.text}</p>

      {isPhoto && (
        <div className="dare-photo-zone">
          {event.photo ? (
            <div className="dare-photo-preview">
              <img src={event.photo} alt="Dare selfie" />
              {youWereCaptured && (
                <button
                  className="ghost small"
                  onClick={() => dispatch({ type: 'LUDO_CAPTURE_CLEAR_PHOTO', who: role })}
                >
                  Redo photo
                </button>
              )}
            </div>
          ) : youWereCaptured ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
              <button
                className="cta"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : '📸 Take / upload selfie'}
              </button>
              <p className="subtle center">Your photo will only show here during this moment.</p>
              {err && <p className="error-text">{err}</p>}
            </>
          ) : (
            <div className="waiting-card">
              <div className="spinner" />
              <p>Waiting for {partner?.name} to send a selfie...</p>
            </div>
          )}
        </div>
      )}

      {!isPhoto && (
        <p className="subtle center">
          {youWereCaptured
            ? 'Use the voice chat above to respond out loud.'
            : `Listen for ${partner?.name} on voice chat above.`}
        </p>
      )}

      <button
        className="cta"
        onClick={() => dispatch({ type: 'LUDO_ACK_CAPTURE', who: role })}
        disabled={iAcked || mustWaitForPhoto}
        title={mustWaitForPhoto ? 'Upload a selfie to continue' : undefined}
      >
        {iAcked ? `Waiting for ${partner?.name}...` : 'Continue'}
      </button>
      <p className="subtle center">
        {me?.name} ready: {event.acked?.[role] ? 'yes' : 'no'}
        {' | '}
        {partner?.name} ready: {event.acked?.[role === 'host' ? 'guest' : 'host'] ? 'yes' : 'no'}
      </p>
    </div>
  )
}

function LudoHeartChoiceEvent({ event, role, me, partner, dispatch }) {
  const iLanded = event.landed === role
  const iGuess = !iLanded
  const responderName = iLanded ? me?.name : partner?.name
  const guesserName = iLanded ? partner?.name : me?.name
  const partnerName = iLanded ? partner?.name : me?.name
  const fmt = (t) =>
    formatQuestion(t, { viewerIsResponder: iLanded, responderName, partnerName })
  const questionText = fmt(event.question.text)
  const [pick, setPick] = useState('')

  useEffect(() => {
    setPick('')
  }, [event.phase])

  if (event.phase === 'picking') {
    return (
      <div className="ludo-event heart">
        <h2>♥ Heart cell</h2>
        <div className="category-chip">{event.question.category}</div>
        <h3 className="question">{questionText}</h3>
        {iLanded ? (
          <>
            <p className="subtle">Pick your honest answer. {partner?.name} will try to guess which one.</p>
            <OptionPicker options={event.question.options} value={pick} onChange={setPick} formatLabel={fmt} />
            <button
              className="cta"
              disabled={!pick}
              onClick={() => {
                sfx.lock()
                dispatch({ type: 'LUDO_HEART_PICK', who: role, choice: pick })
              }}
            >
              Lock answer
            </button>
          </>
        ) : (
          <div className="waiting-card">
            <div className="spinner" />
            <p>Waiting for {partner?.name} to pick their answer...</p>
          </div>
        )}
      </div>
    )
  }

  if (event.phase === 'guessing') {
    return (
      <div className="ludo-event heart">
        <h2>♥ Heart cell</h2>
        <div className="category-chip">{event.question.category}</div>
        <h3 className="question">{questionText}</h3>
        {iGuess ? (
          <>
            <p className="subtle">{partner?.name} picked one. Which do you think they chose?</p>
            <OptionPicker options={event.question.options} value={pick} onChange={setPick} formatLabel={fmt} />
            <button
              className="cta"
              disabled={!pick}
              onClick={() => {
                sfx.lock()
                dispatch({ type: 'LUDO_HEART_GUESS', who: role, choice: pick })
              }}
            >
              Lock guess and reveal
            </button>
          </>
        ) : (
          <div className="waiting-card">
            <div className="spinner" />
            <p>Answer locked. Waiting for {partner?.name} to guess...</p>
          </div>
        )}
      </div>
    )
  }

  // reveal phase (choice)
  return (
    <div className={`ludo-event heart reveal-box ${event.matched ? 'is-match' : 'is-miss'}`}>
      <HeartBurst size={120} matched={event.matched} />
      <h2>{event.matched ? '♥ Matched!' : '♥ Not quite'}</h2>
      <h3 className="question">{questionText}</h3>
      <ChoiceRevealGrid
        options={event.question.options}
        answer={event.answer}
        guess={event.guess}
        responderName={responderName}
        guesserName={guesserName}
        formatLabel={fmt}
      />
      {event.matched ? (
        <p className="match-badge">Exact match - {responderName} gets +3 move and an extra roll</p>
      ) : (
        <p className="subtle center">
          Missed it. Turn goes to {event.landed === 'host' ? partner?.name : me?.name}.
        </p>
      )}
      <button
        className="cta"
        onClick={() => {
          sfx.click()
          dispatch({ type: 'LUDO_HEART_CONTINUE' })
        }}
      >
        Continue
      </button>
    </div>
  )
}

function LudoHeartEvent({ ludo, role, me, partner, dispatch }) {
  const event = ludo.event
  const isChoice = event.question.type === 'choice'

  if (isChoice) {
    return (
      <LudoHeartChoiceEvent
        event={event}
        role={role}
        me={me}
        partner={partner}
        dispatch={dispatch}
      />
    )
  }

  const iLanded = event.landed === role
  const responderName = iLanded ? me?.name : partner?.name
  const partnerName = iLanded ? partner?.name : me?.name
  const questionText = formatQuestion(event.question.text, {
    viewerIsResponder: iLanded,
    responderName,
    partnerName,
  })

  if (event.phase === 'prompt') {
    return (
      <div className="ludo-event heart">
        <h2>♥ Heart cell</h2>
        <div className="category-chip">{event.question.category}</div>
        <h3 className="question">{questionText}</h3>
        <div className="voice-hint">
          <span className="voice-hint-icon">{'\uD83C\uDFA4'}</span>
          <div>
            <strong>Use voice chat for this prompt.</strong>
            <div className="voice-hint-sub">
              Tap <em>Start voice chat</em> in the top-right corner (both partners need to enable it).
            </div>
          </div>
        </div>
        <p className="subtle">
          {iLanded
            ? `Say your answer out loud to ${partner?.name} over the call. When done, they decide if you matched their vibe.`
            : `${partner?.name} will say their answer aloud on the call. Listen, then judge if they matched.`}
        </p>
        {iLanded ? (
          <button
            className="cta"
            onClick={() => {
              sfx.click()
              dispatch({ type: 'LUDO_HEART_BEGIN_JUDGING' })
            }}
          >
            I said it — let {partner?.name} judge
          </button>
        ) : (
          <p className="subtle center">Waiting for {partner?.name} to answer out loud...</p>
        )}
      </div>
    )
  }

  if (event.phase === 'judging') {
    const iJudge = !iLanded
    return (
      <div className="ludo-event heart">
        <h2>♥ Did you match?</h2>
        <h3 className="question">{questionText}</h3>
        {iJudge ? (
          <>
            <p className="subtle">Did {partner?.name}'s answer match how you'd describe it?</p>
            <div className="judge-row">
              <button
                className="cta match"
                onClick={() => {
                  sfx.click()
                  dispatch({ type: 'LUDO_HEART_JUDGE', matched: true })
                }}
              >
                Perfect match (+3 move)
              </button>
              <button
                className="ghost"
                onClick={() => {
                  sfx.click()
                  dispatch({ type: 'LUDO_HEART_JUDGE', matched: false })
                }}
              >
                Close but no
              </button>
            </div>
          </>
        ) : (
          <p className="subtle center">Waiting for {partner?.name} to judge...</p>
        )}
      </div>
    )
  }

  // reveal phase (open)
  return (
    <div className={`ludo-event heart reveal-box ${event.matched ? 'is-match' : 'is-miss'}`}>
      <HeartBurst size={120} matched={event.matched} />
      <h2>{event.matched ? '♥ Matched!' : '♥ Not quite'}</h2>
      <h3 className="question">{questionText}</h3>
      {event.matched ? (
        <>
          <p className="reaction center">
            {iLanded
              ? `${partner?.name} felt your answer. You get +3 move and an extra roll.`
              : `You felt ${partner?.name}'s answer. They get +3 move and an extra roll.`}
          </p>
          <div className="match-badge">+3 move</div>
        </>
      ) : (
        <>
          <p className="reaction center">
            {iLanded
              ? `${partner?.name} wasn't convinced. Turn goes to them.`
              : `Close but not quite. Turn comes to you.`}
          </p>
          <p className="subtle center">Turn goes to {partnerName}.</p>
        </>
      )}
      <button
        className="cta"
        onClick={() => {
          sfx.click()
          dispatch({ type: 'LUDO_HEART_CONTINUE' })
        }}
      >
        Continue
      </button>
    </div>
  )
}

function LudoAnalysis({ ludo, state, role }) {
  const analysis = useMemo(
    () => computeLudoAnalysis(ludo, state.players),
    [ludo, state.players],
  )
  if (!analysis) return null
  const {
    coupleAccuracy, hostRate, guestRate, totalHearts, totalMatches,
    durationMin, verdict, verdictTone, awards,
    host, guest, turns, hostName, guestName,
  } = analysis

  const myStats = role === 'host' ? host : guest
  const theirStats = role === 'host' ? guest : host
  const myName = role === 'host' ? hostName : guestName
  const theirName = role === 'host' ? guestName : hostName
  const myRate = role === 'host' ? hostRate : guestRate
  const theirRate = role === 'host' ? guestRate : hostRate

  return (
    <div className="ludo-analysis">
      <div className={`love-score-card tone-${verdictTone}`}>
        <div className="love-score-label">Love Sync</div>
        <div className="love-score-value">
          <span className="big-number">{coupleAccuracy}</span>
          <span className="percent">%</span>
        </div>
        <div className="love-score-verdict">{verdict}</div>
        <div className="love-score-bar">
          <div className="lsb-fill" style={{ width: `${Math.min(100, coupleAccuracy)}%` }} />
        </div>
        <p className="subtle center small">
          Based on {totalMatches}/{totalHearts} heart prompts matched as a couple.
        </p>
      </div>

      <div className="analysis-grid">
        <StatBox icon="⏱️" label="Duration" value={`${durationMin} min`} />
        <StatBox icon="🔁" label="Total turns" value={turns} />
        <StatBox icon="💖" label="Hearts landed" value={totalHearts} />
        <StatBox icon="✨" label="Hearts matched" value={totalMatches} />
        <StatBox icon="💥" label="Captures" value={host.capturesMade + guest.capturesMade} />
        <StatBox icon="📸" label="Dares done" value={host.daresCompleted + guest.daresCompleted} />
      </div>

      <h3 className="analysis-heading">Player breakdown</h3>
      <div className="player-breakdown">
        <PlayerStatCard
          name={myName}
          isMe
          rate={myRate}
          stats={myStats}
        />
        <PlayerStatCard
          name={theirName}
          rate={theirRate}
          stats={theirStats}
        />
      </div>

      {awards.length > 0 && (
        <>
          <h3 className="analysis-heading">Awards</h3>
          <div className="awards-grid">
            {awards.map((a, i) => (
              <div key={i} className="award-card">
                <div className="award-icon">{a.icon}</div>
                <div className="award-main">
                  <div className="award-title">{a.title}</div>
                  <div className="award-holder">{a.holder}</div>
                  <div className="award-desc">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatBox({ icon, label, value }) {
  return (
    <div className="stat-box">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function PlayerStatCard({ name, isMe, rate, stats }) {
  return (
    <div className={`player-stat-card ${isMe ? 'me' : ''}`}>
      <div className="psc-head">
        <strong>{name}</strong>
        {isMe && <span className="psc-you">you</span>}
      </div>
      <div className="psc-rate">
        <span className="psc-rate-num">{rate}%</span>
        <span className="psc-rate-label">heart match</span>
      </div>
      <div className="psc-rate-bar">
        <div className="psc-rate-fill" style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
      <ul className="psc-list">
        <li><span>Rolls</span><strong>{stats.rolls}</strong></li>
        <li><span>Sixes</span><strong>{stats.sixes}</strong></li>
        <li><span>Captures made</span><strong>{stats.capturesMade}</strong></li>
        <li><span>Captures suffered</span><strong>{stats.capturesSuffered}</strong></li>
        <li><span>Hearts landed</span><strong>{stats.heartsLanded}</strong></li>
        <li><span>Hearts matched</span><strong>{stats.heartsMatched}</strong></li>
        <li><span>Bonus moves</span><strong>+{stats.bonusMoves}</strong></li>
        <li><span>Dares done</span><strong>{stats.daresCompleted}</strong></li>
      </ul>
    </div>
  )
}

function LudoScreen({ state, role, dispatch, me, partner, onLeave }) {
  const ludo = state.ludo

  const eventKind = ludo?.event?.kind
  const eventPhase = ludo?.event?.phase
  const eventMatched = ludo?.event?.matched
  const winner = ludo?.winner

  const realPositions = ludo?.positions ?? { host: START_CELLS.host, guest: START_CELLS.guest }
  const { display: animatedPositions, animating } = useAnimatedPositions(realPositions)
  const isMoving = !!(animating.host || animating.guest)
  useEffect(() => {
    if (eventKind === 'heart') sfx.heart()
    else if (eventKind === 'capture') sfx.capture()
  }, [eventKind])
  useEffect(() => {
    if (eventKind === 'heart' && eventPhase === 'reveal') {
      const t = setTimeout(() => {
        if (eventMatched) sfx.match()
        else sfx.miss()
      }, 200)
      return () => clearTimeout(t)
    }
  }, [eventKind, eventPhase, eventMatched])
  useEffect(() => {
    if (winner) {
      const t = setTimeout(() => sfx.win(), 200)
      return () => clearTimeout(t)
    }
  }, [winner])

  if (!ludo) return null

  const myTurn = ludo.turn === role
  const hostName = state.players.host?.name
  const guestName = state.players.guest?.name
  const myDistance = ludo.distance[role]
  const partnerDistance = ludo.distance[role === 'host' ? 'guest' : 'host']

  if (ludo.subphase === 'done' && ludo.winner) {
    const iWon = ludo.winner === role
    return (
      <section className="panel has-illus">
        {iWon && <SparkleConfetti count={24} />}
        <h1 className="final-title">
          {iWon && <BeatingHeart size={32} />} {iWon ? 'You won!' : `${partner?.name} won the race!`}
        </h1>
        <p className="subtle center">
          {iWon
            ? 'First to lap the heart track.'
            : `${partner?.name} lapped the board first. Rematch?`}
        </p>

        <LudoAnalysis ludo={ludo} state={state} role={role} />

        <div className="final-actions">
          {role === 'host' && (
            <button className="cta" onClick={() => dispatch({ type: 'LUDO_RESTART' })}>
              Rematch
            </button>
          )}
          {role === 'host' && (
            <button className="ghost" onClick={() => dispatch({ type: 'LUDO_BACK_TO_LOBBY' })}>
              Back to lobby
            </button>
          )}
          {role !== 'host' && (
            <p className="subtle center">
              Waiting for {partner?.name} to pick what's next...
            </p>
          )}
          <button className="ghost" onClick={onLeave}>Leave room</button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel ludo-panel">
      <header className="panel-header tight">
        <h1>Love Ludo</h1>
        <p className="tagline">
          Round the heart loop with {partner?.name}
        </p>
      </header>

      <div className="ludo-score-row">
        <div className="ludo-score">
          <span className="chip host" /> {hostName}
          <strong>{ludo.distance.host}/{WIN_DISTANCE}</strong>
        </div>
        <div className="ludo-score">
          <span className="chip guest" /> {guestName}
          <strong>{ludo.distance.guest}/{WIN_DISTANCE}</strong>
        </div>
      </div>

      <LudoBoard
        ludo={ludo}
        hostName={hostName}
        guestName={guestName}
        displayPositions={animatedPositions}
        movingHost={animating.host}
        movingGuest={animating.guest}
      />

      <div className="ludo-progress">
        <div className="you-block">
          <div className="you-label">You</div>
          <div className="progress-bar">
            <div
              className="progress-fill me"
              style={{ width: `${Math.min(100, (myDistance / WIN_DISTANCE) * 100)}%` }}
            />
          </div>
          <div className="dist-label">{myDistance} / {WIN_DISTANCE}</div>
        </div>
        <div className="you-block">
          <div className="you-label">{partner?.name}</div>
          <div className="progress-bar">
            <div
              className="progress-fill them"
              style={{ width: `${Math.min(100, (partnerDistance / WIN_DISTANCE) * 100)}%` }}
            />
          </div>
          <div className="dist-label">{partnerDistance} / {WIN_DISTANCE}</div>
        </div>
      </div>

      <div className="ludo-roll-row">
        <Dice value={ludo.dice} />
        <div className="roll-action">
          <div className="turn-indicator">
            {myTurn ? 'Your turn' : `${partner?.name}'s turn`}
          </div>
          {ludo.subphase === 'rolling' && myTurn && (
            <button
              className="cta"
              onClick={() => {
                sfx.click()
                dispatch({ type: 'LUDO_ROLL', who: role })
              }}
            >
              Roll the dice
            </button>
          )}
          {ludo.subphase === 'rolling' && !myTurn && (
            <div className="waiting-card inline">
              <div className="spinner small" />
              <p>{partner?.name} is rolling...</p>
            </div>
          )}
          {ludo.subphase === 'event' && isMoving && (
            <div className="waiting-card inline">
              <div className="spinner small" />
              <p>Moving...</p>
            </div>
          )}
          {ludo.subphase === 'event' && !isMoving && (
            <div className="waiting-card inline">
              <p>Event on cell {ludo.positions[ludo.turn]}</p>
            </div>
          )}
        </div>
      </div>

      {ludo.subphase === 'event' && !isMoving && ludo.event?.kind === 'capture' && (
        <LudoCaptureEvent ludo={ludo} role={role} me={me} partner={partner} dispatch={dispatch} />
      )}
      {ludo.subphase === 'event' && !isMoving && ludo.event?.kind === 'heart' && (
        <LudoHeartEvent ludo={ludo} role={role} me={me} partner={partner} dispatch={dispatch} />
      )}

      {ludo.log?.length > 0 && (
        <ul className="ludo-log">
          {ludo.log.slice(0, 3).map((entry, i) => (
            <li key={`${entry.t}-${i}`}>{entry.text}</li>
          ))}
        </ul>
      )}

      <button className="ghost" onClick={onLeave}>Leave room</button>
    </section>
  )
}

function MuteToggle() {
  const [muted, setLocalMuted] = useState(() => isMuted())
  const toggle = () => {
    const next = !muted
    setMuted(next)
    setLocalMuted(next)
    primeAudio()
    if (!next) sfx.click()
  }
  return (
    <button
      type="button"
      className={`mute-toggle ${muted ? 'is-muted' : ''}`}
      onClick={toggle}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
    >
      <span className="mute-icon">{muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</span>
    </button>
  )
}

function DisconnectedBanner({ partnerOnline, partner, phase }) {
  if (phase === 'lobby') return null
  if (partnerOnline) return null
  return (
    <div className="disconnected-banner">
      {partner?.name ?? 'Partner'} disconnected. Waiting for them to come back...
    </div>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return <MissingConfigScreen />
  }
  return <AppInner />
}

function AppInner() {
  const room = useRoom()
  const {
    mode,
    role,
    state,
    roomCode,
    partnerOnline,
    connecting,
    error,
    me,
    partner,
    createRoom,
    joinRoom,
    leaveRoom,
    dispatch,
  } = room

  const voice = useVoice({ roomCode, role })

  const shouldAnnounce =
    mode === 'hosting'
    && state.visibility === 'public'
    && !state.players.guest
    && !!roomCode
  const announce = useMemo(
    () =>
      shouldAnnounce
        ? {
            code: roomCode,
            hostName: me?.name || 'Host',
            mode: state.config.mode,
            spice: state.config.spice,
            gameType: state.gameType,
          }
        : null,
    [shouldAnnounce, roomCode, me?.name, state.config.mode, state.config.spice, state.gameType],
  )
  const { rooms: publicRooms, closeAnnouncement } = useLobby({ announce })

  useEffect(() => {
    if (state.players.guest && roomCode) {
      closeAnnouncement(roomCode)
    }
  }, [state.players.guest, roomCode, closeAnnouncement])

  const [strangerNickname, setStrangerNickname] = useState('')
  const matchmaking = useMatchmaking({
    nickname: strangerNickname,
    onMatched: ({ role: assignedRole, code, partnerName }) => {
      if (assignedRole === 'host') {
        createRoom(strangerNickname, {
          code,
          visibility: 'stranger',
          config: { mode: 'fun', spice: 2 },
        })
      } else {
        joinRoom(strangerNickname, code)
      }
      void partnerName
    },
  })

  const onStartStranger = (nickname) => {
    setStrangerNickname(nickname)
    setTimeout(() => matchmaking.start(), 0)
  }

  let content
  if (mode === 'menu') {
    content = (
      <MenuScreen
        onCreate={createRoom}
        onJoin={joinRoom}
        onStartStranger={onStartStranger}
        onStopMatch={matchmaking.stop}
        matchStatus={matchmaking.status}
        publicRooms={publicRooms}
        connecting={connecting}
        error={error || matchmaking.error}
      />
    )
  } else if (mode === 'hosting' && !state.players.guest) {
    content = (
      <WaitingForPartnerScreen
        roomCode={roomCode}
        partnerOnline={partnerOnline}
        onLeave={leaveRoom}
        visibility={state.visibility}
      />
    )
  } else if (mode === 'joining' && !state.players.host) {
    content = <ConnectingScreen roomCode={roomCode} onLeave={leaveRoom} />
  } else if (state.phase === 'lobby') {
    content = (
      <LobbyScreen
        role={role}
        state={state}
        dispatch={dispatch}
        me={me}
        partner={partner}
        roomCode={roomCode}
        onLeave={leaveRoom}
      />
    )
  } else if (state.phase === 'answer') {
    content = <AnswerScreen state={state} role={role} dispatch={dispatch} me={me} partner={partner} />
  } else if (state.phase === 'guess') {
    content = <GuessScreen state={state} role={role} dispatch={dispatch} me={me} partner={partner} />
  } else if (state.phase === 'reveal') {
    content = <RevealScreen state={state} role={role} dispatch={dispatch} me={me} partner={partner} />
  } else if (state.phase === 'ludo') {
    content = <LudoScreen state={state} role={role} dispatch={dispatch} me={me} partner={partner} onLeave={leaveRoom} />
  } else if (state.phase === 'final') {
    content = (
      <FinalScreen
        state={state}
        role={role}
        dispatch={dispatch}
        me={me}
        partner={partner}
        onLeave={leaveRoom}
      />
    )
  }

  const inRoom = mode !== 'menu' && roomCode
  const showVoice = inRoom
  const showChat = inRoom && role && state.players[role] && state.players[role === 'host' ? 'guest' : 'host']
  const visibilityLabel = state.visibility === 'stranger'
    ? 'Stranger'
    : state.visibility === 'public' ? 'Public' : ''

  return (
    <main className="app-shell">
      <div className="glow-bg" aria-hidden="true" />
      <DisconnectedBanner
        partnerOnline={partnerOnline}
        partner={partner}
        phase={state.phase}
      />
      {showVoice && (
        <VoiceControls
          voice={voice}
          partnerName={partner?.name}
          highlight={state.phase === 'ludo' && state.ludo?.event?.kind === 'heart'}
        />
      )}
      <MuteToggle />
      {content}
      {showChat && (
        <ChatPanel state={state} role={role} me={me} dispatch={dispatch} />
      )}
      <footer className="footer">
        <span>Love Swap</span>
        {inRoom && (
          <>
            <span className="sep">-</span>
            <span>Room {roomCode}</span>
            {visibilityLabel && (
              <>
                <span className="sep">-</span>
                <span>{visibilityLabel}</span>
              </>
            )}
          </>
        )}
      </footer>
    </main>
  )
}

export default App
