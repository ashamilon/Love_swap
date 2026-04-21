import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useRoom } from './lib/useRoom.js'
import { useVoice } from './lib/useVoice.js'
import { isSupabaseConfigured } from './lib/supabase.js'
import { formatQuestion } from './data/questions.js'
import { HEART_CELLS, START_CELLS, TRACK_SIZE } from './lib/useRoom.js'
import { sfx, isMuted, setMuted, primeAudio } from './lib/sounds.js'

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
            primeAudio()
            sfx.lock()
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

function OptionPicker({ options, value, onChange }) {
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
          {opt}
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
  const questionText = formatQuestion(turn.question.text, {
    viewerIsResponder: iAmResponder,
    responderName,
  })

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
  const questionText = formatQuestion(turn.question.text, {
    viewerIsResponder: !iAmGuesser,
    responderName,
  })

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

function ChoiceRevealGrid({ options, answer, guess, responderName, guesserName }) {
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
            <span className="choice-text">{opt}</span>
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
  const questionText = formatQuestion(turn.question.text, {
    viewerIsResponder,
    responderName,
  })

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

// ---------- LOVE LUDO ----------

// 7x7 grid perimeter traversal mapping cellIndex -> (row, col)
function cellCoords(i) {
  if (i <= 6) return { row: 0, col: i } // top: 0..6
  if (i <= 11) return { row: i - 6, col: 6 } // right: 7..11
  if (i <= 18) return { row: 6, col: 18 - i } // bottom: 12..18
  return { row: 24 - i, col: 0 } // left: 19..23
}

function LudoBoard({ ludo, hostName, guestName }) {
  const cells = []
  for (let i = 0; i < TRACK_SIZE; i += 1) {
    const { row, col } = cellCoords(i)
    const isHeart = HEART_CELLS.includes(i)
    const isHostStart = i === START_CELLS.host
    const isGuestStart = i === START_CELLS.guest
    const hasHost = ludo.positions.host === i
    const hasGuest = ludo.positions.guest === i

    const classes = ['ludo-cell']
    if (isHeart) classes.push('heart')
    if (isHostStart) classes.push('start-host')
    if (isGuestStart) classes.push('start-guest')

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
        {isHostStart && !isHeart && <span className="ludo-cell-mark">H</span>}
        {isGuestStart && !isHeart && <span className="ludo-cell-mark">G</span>}
        <div className="ludo-tokens">
          {hasHost && <div className="ludo-token host" title={hostName || 'Host'} />}
          {hasGuest && <div className="ludo-token guest" title={guestName || 'Guest'} />}
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
  const youWereCaptured = event.captured === role
  const youDidCapture = event.by === role
  const iAcked = Boolean(event.acked?.[role])

  return (
    <div className="ludo-event capture">
      <h2>{youDidCapture ? 'Gotcha!' : youWereCaptured ? 'You got caught' : ''}</h2>
      {youDidCapture && (
        <p>You landed on {partner?.name}. They head back to start and you get an extra roll.</p>
      )}
      {youWereCaptured && (
        <>
          <p>{partner?.name} caught your token. Your dare:</p>
          <p className="dare-text">{event.dare}</p>
        </>
      )}
      <button
        className="cta"
        onClick={() => dispatch({ type: 'LUDO_ACK_CAPTURE', who: role })}
        disabled={iAcked}
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

function LudoHeartEvent({ ludo, role, me, partner, dispatch }) {
  const event = ludo.event
  const iLanded = event.landed === role
  const responderName = iLanded ? me?.name : partner?.name
  const questionText = formatQuestion(event.question.text, {
    viewerIsResponder: iLanded,
    responderName,
  })
  const isChoice = event.question.type === 'choice'

  if (event.phase === 'prompt') {
    return (
      <div className="ludo-event heart">
        <h2>♥ Heart cell</h2>
        <div className="category-chip">{event.question.category}</div>
        <h3 className="question">{questionText}</h3>
        {isChoice && (
          <div className="option-grid static">
            {event.question.options.map((opt) => (
              <div key={opt} className="option-btn static">{opt}</div>
            ))}
          </div>
        )}
        <p className="subtle">
          {iLanded
            ? `Say your answer out loud to ${partner?.name} (use voice chat above). When done, they decide if they matched your vibe.`
            : `${partner?.name} will say their answer aloud. Listen on voice, then judge if you matched.`}
        </p>
        {iLanded ? (
          <button
            className="cta"
            onClick={() => dispatch({ type: 'LUDO_HEART_BEGIN_JUDGING' })}
          >
            I said it — let {partner?.name} judge
          </button>
        ) : (
          <p className="subtle center">Waiting for {partner?.name} to answer out loud...</p>
        )}
      </div>
    )
  }

  // judging phase
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
              onClick={() => dispatch({ type: 'LUDO_HEART_JUDGE', matched: true })}
            >
              Perfect match (+3 move)
            </button>
            <button
              className="ghost"
              onClick={() => dispatch({ type: 'LUDO_HEART_JUDGE', matched: false })}
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

function LudoScreen({ state, role, dispatch, me, partner, onLeave }) {
  const ludo = state.ludo

  const eventKind = ludo?.event?.kind
  const winner = ludo?.winner
  useEffect(() => {
    if (eventKind === 'heart') sfx.heart()
    else if (eventKind === 'capture') sfx.capture()
  }, [eventKind])
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
      <section className="panel">
        <h1 className="final-title">{iWon ? 'You won!' : `${partner?.name} won the race!`}</h1>
        <p className="subtle center">
          {iWon
            ? 'First to lap the heart track. You read each other perfectly.'
            : `${partner?.name} lapped the board first. Rematch?`}
        </p>
        <LudoBoard ludo={ludo} hostName={hostName} guestName={guestName} />
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
          <strong>{ludo.distance.host}/{TRACK_SIZE}</strong>
        </div>
        <div className="ludo-score">
          <span className="chip guest" /> {guestName}
          <strong>{ludo.distance.guest}/{TRACK_SIZE}</strong>
        </div>
      </div>

      <LudoBoard ludo={ludo} hostName={hostName} guestName={guestName} />

      <div className="ludo-progress">
        <div className="you-block">
          <div className="you-label">You</div>
          <div className="progress-bar">
            <div
              className="progress-fill me"
              style={{ width: `${Math.min(100, (myDistance / TRACK_SIZE) * 100)}%` }}
            />
          </div>
          <div className="dist-label">{myDistance} / {TRACK_SIZE}</div>
        </div>
        <div className="you-block">
          <div className="you-label">{partner?.name}</div>
          <div className="progress-bar">
            <div
              className="progress-fill them"
              style={{ width: `${Math.min(100, (partnerDistance / TRACK_SIZE) * 100)}%` }}
            />
          </div>
          <div className="dist-label">{partnerDistance} / {TRACK_SIZE}</div>
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
          {ludo.subphase === 'event' && (
            <div className="waiting-card inline">
              <p>Event on cell {ludo.positions[ludo.turn]}</p>
            </div>
          )}
        </div>
      </div>

      {ludo.subphase === 'event' && ludo.event?.kind === 'capture' && (
        <LudoCaptureEvent ludo={ludo} role={role} me={me} partner={partner} dispatch={dispatch} />
      )}
      {ludo.subphase === 'event' && ludo.event?.kind === 'heart' && (
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
      <MuteToggle />
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
