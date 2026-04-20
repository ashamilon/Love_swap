import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useRoom } from './lib/useRoom.js'
import { useVoice } from './lib/useVoice.js'
import { isSupabaseConfigured } from './lib/supabase.js'

function VoiceControls({ voice, partnerName }) {
  const { enabled, status, muted, error, enable, disable, toggleMute, audioRef } = voice

  const statusLabel = (() => {
    switch (status) {
      case 'idle': return 'Voice off'
      case 'requesting': return 'Asking mic...'
      case 'waiting': return partnerName ? `Waiting for ${partnerName}...` : 'Waiting for partner...'
      case 'connecting': return 'Connecting voice...'
      case 'connected': return partnerName ? `Talking with ${partnerName}` : 'Voice connected'
      case 'muted': return 'You are muted'
      case 'denied': return 'Mic permission denied'
      case 'failed': return 'Voice failed'
      default: return status
    }
  })()

  const dotClass = (() => {
    if (status === 'connected' || status === 'muted') return 'online'
    if (status === 'failed' || status === 'denied') return 'error'
    if (status === 'idle') return 'dim'
    return 'offline'
  })()

  return (
    <div className="voice-bar">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="voice-status">
        <span className={`dot ${dotClass}`} />
        <span>{statusLabel}</span>
      </div>
      <div className="voice-actions">
        {!enabled ? (
          <button
            className="cta small"
            onClick={enable}
            disabled={status === 'requesting'}
          >
            {status === 'requesting' ? 'Requesting...' : 'Enable voice'}
          </button>
        ) : (
          <>
            <button className={muted ? 'cta small' : 'ghost small'} onClick={toggleMute}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button className="ghost small" onClick={disable}>
              Hang up
            </button>
          </>
        )}
      </div>
      {error && status === 'denied' && (
        <p className="voice-error">
          Browser blocked mic access. Enable it in your browser's site settings and try again.
        </p>
      )}
      {error && status === 'failed' && (
        <p className="voice-error">Could not connect voice. Check your network and try again.</p>
      )}
    </div>
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

function MenuScreen({ onCreate, onJoin, connecting, error }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState('create')

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Love Swap</h1>
        <p className="tagline">A long-distance game for one couple. Who reads their partner better?</p>
      </header>

      <div className="tabs">
        <button
          className={tab === 'create' ? 'tab active' : 'tab'}
          onClick={() => setTab('create')}
        >
          Create room
        </button>
        <button
          className={tab === 'join' ? 'tab active' : 'tab'}
          onClick={() => setTab('join')}
        >
          Join room
        </button>
      </div>

      {tab === 'create' ? (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            onCreate(name)
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
          <button type="submit" className="cta" disabled={connecting}>
            {connecting ? 'Creating...' : 'Create room'}
          </button>
          <p className="subtle">You will get a short room code to share with your partner.</p>
        </form>
      ) : (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
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

      {error && <p className="error">{error}</p>}
    </section>
  )
}

function WaitingForPartnerScreen({ roomCode, onLeave, partnerOnline }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
    } catch (e) {
      void e
    }
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h1>Share your code</h1>
        <p className="tagline">Send this to your partner. You both play from any device.</p>
      </header>

      <div className="code-display">
        <div className="code-value">{roomCode}</div>
        <button className="ghost small" onClick={copy}>
          Copy code
        </button>
      </div>

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
        <h3>Game settings</h3>
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

        <label className="toggle">
          <input
            type="checkbox"
            checked={config.doublePoints}
            onChange={(e) => update({ doublePoints: e.target.checked })}
            disabled={!isHost}
          />
          Random double-points round
        </label>
      </div>

      {isHost ? (
        <button className="cta" onClick={() => dispatch({ type: 'START_GAME' })}>
          Start game
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

function AnswerScreen({ state, role, dispatch, me, partner }) {
  const turn = state.turns[state.turnIndex]
  const iAmResponder = turn.responder === role
  const [text, setText] = useState('')
  const [hidden, setHidden] = useState(true)

  if (!iAmResponder) {
    return (
      <section className="panel">
        <TurnHeader state={state} me={me} partner={partner} role={role} />
        <div className="category-chip">{turn.question.category}</div>
        <h2 className="question">{turn.question.text}</h2>
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
    dispatch({ type: 'SUBMIT_ANSWER', text: text.trim() })
    setText('')
  }

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <div className="category-chip">{turn.question.category}</div>
      <h2 className="question">{turn.question.text}</h2>
      <p className="subtle">Type honestly. {partner?.name} will try to guess what you say.</p>

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
    </section>
  )
}

function GuessScreen({ state, role, dispatch, me, partner }) {
  const turn = state.turns[state.turnIndex]
  const iAmGuesser = turn.responder !== role
  const [text, setText] = useState('')

  if (!iAmGuesser) {
    return (
      <section className="panel">
        <TurnHeader state={state} me={me} partner={partner} role={role} />
        <div className="category-chip">{turn.question.category}</div>
        <h2 className="question">{turn.question.text}</h2>
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
    dispatch({ type: 'SUBMIT_GUESS', text: text.trim() })
    setText('')
  }

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <div className="category-chip">{turn.question.category}</div>
      <h2 className="question">{turn.question.text}</h2>
      <p className="subtle">{partner?.name} has answered. What do you think they said?</p>

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
    </section>
  )
}

function RevealScreen({ state, role, dispatch, me, partner }) {
  const [flipped, setFlipped] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFlipped(true), 350)
    return () => clearTimeout(id)
  }, [])

  const turn = state.turns[state.turnIndex]
  const isHost = role === 'host'
  const responderName = turn.responder === 'host' ? state.players.host?.name : state.players.guest?.name
  const guesserName = turn.responder === 'host' ? state.players.guest?.name : state.players.host?.name

  return (
    <section className="panel">
      <TurnHeader state={state} me={me} partner={partner} role={role} />
      <h2 className="question">{turn.question.text}</h2>

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

      <div className="score-line">
        <p>Similarity: <strong>{Math.round(state.similarity * 100)}%</strong></p>
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

  return (
    <section className="panel final-panel">
      <h1 className="final-title">{verdict}</h1>
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

  let content
  if (mode === 'menu') {
    content = (
      <MenuScreen
        onCreate={createRoom}
        onJoin={joinRoom}
        connecting={connecting}
        error={error}
      />
    )
  } else if (mode === 'hosting' && !state.players.guest) {
    content = (
      <WaitingForPartnerScreen
        roomCode={roomCode}
        partnerOnline={partnerOnline}
        onLeave={leaveRoom}
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

  const showVoice = mode !== 'menu' && roomCode

  return (
    <main className="app-shell">
      <div className="glow-bg" aria-hidden="true" />
      <DisconnectedBanner
        partnerOnline={partnerOnline}
        partner={partner}
        phase={state.phase}
      />
      {showVoice && <VoiceControls voice={voice} partnerName={partner?.name} />}
      {content}
      <footer className="footer">
        <span>Love Swap</span>
        {mode !== 'menu' && (
          <>
            <span className="sep">-</span>
            <span>Room {roomCode}</span>
          </>
        )}
      </footer>
    </main>
  )
}

export default App
