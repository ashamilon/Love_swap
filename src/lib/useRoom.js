import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, generatePlayerId, generateRoomCode } from './supabase.js'
import { buildQuestionPool } from '../data/questions.js'
import { getSimilarity, pointsFromSimilarity } from '../utils/scoring.js'
import { reactionFor } from '../utils/reactions.js'

export const TRACK_SIZE = 24
export const HEART_CELLS = [2, 6, 10, 14, 18, 22]
export const START_CELLS = { host: 0, guest: 12 }
export const WIN_DISTANCE = 48

const CAPTURE_DARES = [
  { text: "You're caught! Blow a kiss and snap a selfie of it.", kind: 'photo' },
  { text: "Captured! Bite your lip and send a cute selfie.", kind: 'photo' },
  { text: "Caught! Flash a heart sign with your hands in a selfie.", kind: 'photo' },
  { text: "Busted! Send a pouty selfie to show who's boss.", kind: 'photo' },
  { text: "Gotcha! Wink at the camera and send a sultry selfie.", kind: 'photo' },
  { text: "Caught red-handed! Strike your most confident pose for a selfie.", kind: 'photo' },
  { text: "Busted! Send a selfie with your hand on your heart.", kind: 'photo' },
  { text: "Gotcha! Make your cutest puppy eyes and send a selfie.", kind: 'photo' },
]

function randomDare() {
  return CAPTURE_DARES[Math.floor(Math.random() * CAPTURE_DARES.length)]
}

function pickHeartQuestion(config) {
  // Heart cells focus on multiple-choice prompts so couples can tap to answer
  // and guess without needing voice chat. We fall back to an open-ended
  // (voice) question only when no choice questions are available at the
  // current mode + spice level.
  const pool = buildQuestionPool(config.mode, Number(config.spice), 40)
  const choices = pool.filter((q) => q.type === 'choice')
  if (choices.length > 0) {
    return choices[Math.floor(Math.random() * choices.length)]
  }
  return pool[0]
}

export const INITIAL_STATE = {
  phase: 'lobby',
  gameType: 'questions', // 'questions' | 'ludo'
  config: { mode: 'flirty', spice: 3, rounds: 5, doublePoints: true },
  players: { host: null, guest: null },
  visibility: 'private', // 'private' | 'public' | 'stranger'

  // question game state
  turns: [],
  turnIndex: 0,
  answerText: '',
  guessText: '',
  similarity: 0,
  points: 0,
  reaction: '',
  scores: { host: 0, guest: 0 },
  results: {},

  // ludo state
  ludo: null,

  // chat (ephemeral; cleared when room ends)
  chat: [],
}

function emptyPlayerStats() {
  return {
    rolls: 0,
    diceTotal: 0,
    sixes: 0,
    biggestRoll: 0,
    heartsLanded: 0,
    heartsMatched: 0,
    capturesMade: 0,
    capturesSuffered: 0,
    daresCompleted: 0,
    bonusMoves: 0,
  }
}

function initLudo() {
  return {
    subphase: 'rolling', // rolling | event | done
    turn: 'host',
    dice: null,
    positions: { host: START_CELLS.host, guest: START_CELLS.guest },
    distance: { host: 0, guest: 0 },
    event: null,
    winner: null,
    log: [],
    stats: {
      startedAt: Date.now(),
      endedAt: null,
      turns: 0,
      host: emptyPlayerStats(),
      guest: emptyPlayerStats(),
    },
  }
}

function buildTurns(config) {
  const rounds = Number(config.rounds)
  const questions = buildQuestionPool(config.mode, Number(config.spice), rounds)
  const doublePointsIdx = config.doublePoints ? Math.floor(Math.random() * rounds) : -1
  return questions.slice(0, rounds).map((q, i) => ({
    id: `t${i}`,
    round: i + 1,
    question: q,
    responder: i % 2 === 0 ? 'host' : 'guest',
    multiplier: i === doublePointsIdx ? 2 : 1,
  }))
}

export function computeLudoAnalysis(ludo, players) {
  if (!ludo || !ludo.stats) return null
  const { stats } = ludo
  const host = stats.host || emptyPlayerStats()
  const guest = stats.guest || emptyPlayerStats()

  const totalHearts = host.heartsLanded + guest.heartsLanded
  const totalMatches = host.heartsMatched + guest.heartsMatched
  const coupleAccuracy = totalHearts > 0
    ? Math.round((totalMatches / totalHearts) * 100)
    : 0
  const hostRate = host.heartsLanded
    ? Math.round((host.heartsMatched / host.heartsLanded) * 100)
    : 0
  const guestRate = guest.heartsLanded
    ? Math.round((guest.heartsMatched / guest.heartsLanded) * 100)
    : 0

  const endedAt = stats.endedAt || Date.now()
  const durationMs = endedAt - (stats.startedAt || endedAt)
  const durationMin = Math.max(1, Math.round(durationMs / 60000))

  let verdict, verdictTone
  if (coupleAccuracy >= 90) { verdict = 'Soulmates'; verdictTone = 'soulmates' }
  else if (coupleAccuracy >= 75) { verdict = 'Deeply in sync'; verdictTone = 'great' }
  else if (coupleAccuracy >= 50) { verdict = 'Finding your groove'; verdictTone = 'good' }
  else if (coupleAccuracy >= 25) { verdict = 'Still learning each other'; verdictTone = 'ok' }
  else { verdict = 'Opposites attract'; verdictTone = 'spark' }

  const hostName = players?.host?.name || 'Host'
  const guestName = players?.guest?.name || 'Guest'
  const awards = []

  // Mind Reader — highest match rate (min 2 hearts landed to qualify)
  if (host.heartsLanded >= 2 || guest.heartsLanded >= 2) {
    if (hostRate > guestRate && host.heartsLanded >= 2) {
      awards.push({ icon: '🧠', title: 'Mind Reader', holder: hostName, desc: `${hostRate}% heart match rate` })
    } else if (guestRate > hostRate && guest.heartsLanded >= 2) {
      awards.push({ icon: '🧠', title: 'Mind Reader', holder: guestName, desc: `${guestRate}% heart match rate` })
    }
  }

  // Heartbreaker — most captures made
  if (host.capturesMade !== guest.capturesMade) {
    const who = host.capturesMade > guest.capturesMade ? 'host' : 'guest'
    const num = who === 'host' ? host.capturesMade : guest.capturesMade
    awards.push({ icon: '💔', title: 'Heartbreaker', holder: who === 'host' ? hostName : guestName, desc: `${num} capture${num === 1 ? '' : 's'}` })
  }

  // Dice Whisperer — most sixes
  if (host.sixes !== guest.sixes && (host.sixes + guest.sixes) >= 2) {
    const who = host.sixes > guest.sixes ? 'host' : 'guest'
    const num = who === 'host' ? host.sixes : guest.sixes
    awards.push({ icon: '🎲', title: 'Dice Whisperer', holder: who === 'host' ? hostName : guestName, desc: `${num} sixes rolled` })
  }

  // Lucky Streak — biggest single roll (only if 6)
  const biggest = Math.max(host.biggestRoll, guest.biggestRoll)
  if (biggest >= 6) {
    const who = host.biggestRoll >= guest.biggestRoll ? 'host' : 'guest'
    awards.push({ icon: '🍀', title: 'Lucky Streak', holder: who === 'host' ? hostName : guestName, desc: `Rolled a ${biggest}` })
  }

  // Romantic Magnet — most heart cells landed
  if (host.heartsLanded !== guest.heartsLanded) {
    const who = host.heartsLanded > guest.heartsLanded ? 'host' : 'guest'
    const num = who === 'host' ? host.heartsLanded : guest.heartsLanded
    awards.push({ icon: '💘', title: 'Romantic Magnet', holder: who === 'host' ? hostName : guestName, desc: `${num} heart cells landed` })
  }

  // Brave Soul — most dares completed
  if (host.daresCompleted !== guest.daresCompleted && (host.daresCompleted + guest.daresCompleted) >= 1) {
    const who = host.daresCompleted > guest.daresCompleted ? 'host' : 'guest'
    const num = who === 'host' ? host.daresCompleted : guest.daresCompleted
    awards.push({ icon: '📸', title: 'Brave Soul', holder: who === 'host' ? hostName : guestName, desc: `${num} dare${num === 1 ? '' : 's'} completed` })
  }

  // In Sync — couple award (shown if >= 70%)
  if (coupleAccuracy >= 70 && totalHearts > 0) {
    awards.push({ icon: '💞', title: 'In Sync', holder: 'Together', desc: `${coupleAccuracy}% couple accuracy` })
  }

  // Marathon — long game
  if (stats.turns >= 30) {
    awards.push({ icon: '🏃', title: 'Marathon', holder: 'Together', desc: `${stats.turns} total turns` })
  }

  return {
    coupleAccuracy,
    hostRate,
    guestRate,
    totalHearts,
    totalMatches,
    durationMin,
    verdict,
    verdictTone,
    awards,
    host,
    guest,
    turns: stats.turns,
    hostName,
    guestName,
  }
}

function advanceTurn(ludo, who) {
  const opp = who === 'host' ? 'guest' : 'host'
  return { ...ludo, turn: opp, subphase: 'rolling', dice: ludo.dice }
}

function bumpRollStats(stats, who, dice) {
  const prev = stats?.[who] || emptyPlayerStats()
  const nextWho = {
    ...prev,
    rolls: prev.rolls + 1,
    diceTotal: prev.diceTotal + dice,
    sixes: prev.sixes + (dice === 6 ? 1 : 0),
    biggestRoll: Math.max(prev.biggestRoll, dice),
  }
  return {
    ...stats,
    turns: (stats?.turns || 0) + 1,
    [who]: nextWho,
  }
}

function resolveRoll(state, who, dice) {
  const ludo = state.ludo
  const opp = who === 'host' ? 'guest' : 'host'
  const oldPos = ludo.positions[who]
  const newPos = (oldPos + dice) % TRACK_SIZE
  const newDistance = ludo.distance[who] + dice

  const positions = { ...ludo.positions, [who]: newPos }
  const distance = { ...ludo.distance, [who]: newDistance }

  const log = [
    { t: Date.now(), text: `${who} rolled ${dice}` },
    ...ludo.log,
  ].slice(0, 6)

  const baseStats = bumpRollStats(ludo.stats, who, dice)

  // Win check
  if (newDistance >= WIN_DISTANCE) {
    return {
      ...state,
      ludo: {
        ...ludo,
        dice,
        positions,
        distance,
        winner: who,
        subphase: 'done',
        log,
        stats: { ...baseStats, endedAt: Date.now() },
      },
    }
  }

  // Capture
  if (newPos === ludo.positions[opp]) {
    positions[opp] = START_CELLS[opp]
    distance[opp] = 0
    const capStats = {
      ...baseStats,
      [who]: { ...baseStats[who], capturesMade: baseStats[who].capturesMade + 1 },
      [opp]: { ...baseStats[opp], capturesSuffered: baseStats[opp].capturesSuffered + 1 },
    }
    return {
      ...state,
      ludo: {
        ...ludo,
        dice,
        positions,
        distance,
        subphase: 'event',
        event: {
          kind: 'capture',
          captured: opp,
          by: who,
          dare: randomDare(),
          photo: null,
          acked: { [opp]: false, [who]: false },
        },
        log: [{ t: Date.now(), text: `${who} captured ${opp}!` }, ...log].slice(0, 6),
        stats: capStats,
      },
    }
  }

  // Heart cell
  if (HEART_CELLS.includes(newPos)) {
    const question = pickHeartQuestion(state.config)
    const isChoice = question.type === 'choice'
    const heartStats = {
      ...baseStats,
      [who]: { ...baseStats[who], heartsLanded: baseStats[who].heartsLanded + 1 },
    }
    return {
      ...state,
      ludo: {
        ...ludo,
        dice,
        positions,
        distance,
        subphase: 'event',
        event: {
          kind: 'heart',
          question,
          landed: who,
          // For open questions: prompt -> judging (voice-based)
          // For choice questions: picking -> guessing -> reveal
          phase: isChoice ? 'picking' : 'prompt',
          answer: null,
          guess: null,
          matched: null,
        },
        log: [{ t: Date.now(), text: `${who} landed on a heart cell` }, ...log].slice(0, 6),
        stats: heartStats,
      },
    }
  }

  // Rolling a 6 = extra turn, else pass
  const nextTurn = dice === 6 ? who : opp
  return {
    ...state,
    ludo: {
      ...ludo,
      dice,
      positions,
      distance,
      subphase: 'rolling',
      turn: nextTurn,
      event: null,
      log,
      stats: baseStats,
    },
  }
}

function reduce(state, action) {
  switch (action.type) {
    case 'SET_GUEST':
      return { ...state, players: { ...state.players, guest: action.player } }
    case 'UPDATE_CONFIG':
      if (state.phase !== 'lobby') return state
      return { ...state, config: { ...state.config, ...action.config } }
    case 'SET_GAME_TYPE':
      if (state.phase !== 'lobby') return state
      return { ...state, gameType: action.gameType }
    case 'SEND_CHAT': {
      const text = typeof action.text === 'string' ? action.text.trim().slice(0, 500) : ''
      if (!text) return state
      const entry = {
        id: `${action.who}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: action.who,
        fromName: action.fromName || action.who,
        text,
        ts: Date.now(),
      }
      const next = [...(state.chat || []), entry].slice(-80)
      return { ...state, chat: next }
    }
    case 'CLEAR_CHAT':
      return { ...state, chat: [] }
    case 'START_GAME':
      if (!state.players.guest) return state
      if (state.gameType === 'ludo') {
        return {
          ...state,
          phase: 'ludo',
          ludo: initLudo(),
        }
      }
      return {
        ...state,
        phase: 'answer',
        turns: buildTurns(state.config),
        turnIndex: 0,
        scores: { host: 0, guest: 0 },
        results: {},
        answerText: '',
        guessText: '',
        similarity: 0,
        points: 0,
        reaction: '',
      }

    // --- Question Game Actions ---
    case 'SUBMIT_ANSWER':
      if (state.phase !== 'answer') return state
      return { ...state, phase: 'guess', answerText: action.text }
    case 'SUBMIT_GUESS': {
      if (state.phase !== 'guess') return state
      const turn = state.turns[state.turnIndex]
      const similarity = getSimilarity(state.answerText, action.text)
      const points = pointsFromSimilarity(similarity, { multiplier: turn.multiplier })
      const guesserKey = turn.responder === 'host' ? 'guest' : 'host'
      return {
        ...state,
        phase: 'reveal',
        guessText: action.text,
        similarity,
        points,
        reaction: reactionFor(points),
        scores: {
          ...state.scores,
          [guesserKey]: state.scores[guesserKey] + points,
        },
        results: {
          ...state.results,
          [turn.id]: {
            answer: state.answerText,
            guess: action.text,
            similarity,
            points,
            guesserKey,
            responder: turn.responder,
            question: turn.question.text,
          },
        },
      }
    }
    case 'NEXT_TURN': {
      const next = state.turnIndex + 1
      if (next >= state.turns.length) return { ...state, phase: 'final' }
      return {
        ...state,
        turnIndex: next,
        phase: 'answer',
        answerText: '',
        guessText: '',
        similarity: 0,
        points: 0,
        reaction: '',
      }
    }
    case 'RESTART':
      return {
        ...INITIAL_STATE,
        players: state.players,
        config: state.config,
        gameType: state.gameType,
      }

    // --- Ludo Actions ---
    case 'LUDO_ROLL': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.subphase !== 'rolling') return state
      if (l.turn !== action.who) return state
      const dice = Math.floor(Math.random() * 6) + 1
      return resolveRoll(state, action.who, dice)
    }
    case 'LUDO_ACK_CAPTURE': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.subphase !== 'event' || l.event?.kind !== 'capture') return state
      const acked = { ...l.event.acked, [action.who]: true }
      if (!acked.host || !acked.guest) {
        return { ...state, ludo: { ...l, event: { ...l.event, acked } } }
      }
      // Both acked — capture gives extra turn to the capturer
      return {
        ...state,
        ludo: {
          ...l,
          event: null,
          subphase: 'rolling',
          turn: l.event.by,
        },
      }
    }
    case 'LUDO_CAPTURE_PHOTO': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.subphase !== 'event' || l.event?.kind !== 'capture') return state
      if (action.who !== l.event.captured) return state
      if (typeof action.dataUrl !== 'string' || !action.dataUrl.startsWith('data:image/')) return state
      const hadPhoto = !!l.event.photo
      const stats = hadPhoto
        ? l.stats
        : {
            ...l.stats,
            [action.who]: {
              ...l.stats[action.who],
              daresCompleted: l.stats[action.who].daresCompleted + 1,
            },
          }
      return {
        ...state,
        ludo: { ...l, stats, event: { ...l.event, photo: action.dataUrl } },
      }
    }
    case 'LUDO_CAPTURE_CLEAR_PHOTO': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.subphase !== 'event' || l.event?.kind !== 'capture') return state
      if (action.who !== l.event.captured) return state
      return {
        ...state,
        ludo: { ...l, event: { ...l.event, photo: null } },
      }
    }
    case 'LUDO_HEART_BEGIN_JUDGING': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.event?.kind !== 'heart' || l.event.phase !== 'prompt') return state
      return {
        ...state,
        ludo: { ...l, event: { ...l.event, phase: 'judging' } },
      }
    }
    case 'LUDO_HEART_JUDGE': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.event?.kind !== 'heart' || l.event.phase !== 'judging') return state
      const matched = Boolean(action.matched)
      const landed = l.event.landed
      const stats = matched
        ? {
            ...l.stats,
            [landed]: {
              ...l.stats[landed],
              heartsMatched: l.stats[landed].heartsMatched + 1,
            },
          }
        : l.stats
      return {
        ...state,
        ludo: {
          ...l,
          stats,
          event: {
            ...l.event,
            matched,
            phase: 'reveal',
          },
        },
      }
    }
    case 'LUDO_HEART_PICK': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.event?.kind !== 'heart' || l.event.phase !== 'picking') return state
      if (action.who !== l.event.landed) return state
      return {
        ...state,
        ludo: { ...l, event: { ...l.event, answer: action.choice, phase: 'guessing' } },
      }
    }
    case 'LUDO_HEART_GUESS': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.event?.kind !== 'heart' || l.event.phase !== 'guessing') return state
      const guesser = l.event.landed === 'host' ? 'guest' : 'host'
      if (action.who !== guesser) return state
      const matched = action.choice === l.event.answer
      const landed = l.event.landed
      const stats = matched
        ? {
            ...l.stats,
            [landed]: {
              ...l.stats[landed],
              heartsMatched: l.stats[landed].heartsMatched + 1,
            },
          }
        : l.stats
      return {
        ...state,
        ludo: {
          ...l,
          stats,
          event: { ...l.event, guess: action.choice, matched, phase: 'reveal' },
        },
      }
    }
    case 'LUDO_HEART_CONTINUE': {
      if (state.phase !== 'ludo') return state
      const l = state.ludo
      if (!l || l.event?.kind !== 'heart' || l.event.phase !== 'reveal') return state
      const who = l.event.landed
      const opp = who === 'host' ? 'guest' : 'host'
      if (l.event.matched) {
        const oldPos = l.positions[who]
        const newPos = (oldPos + 3) % TRACK_SIZE
        const newDist = l.distance[who] + 3
        const positions = { ...l.positions, [who]: newPos }
        const distance = { ...l.distance, [who]: newDist }
        const statsAfterBonus = {
          ...l.stats,
          [who]: { ...l.stats[who], bonusMoves: l.stats[who].bonusMoves + 3 },
        }
        if (newDist >= WIN_DISTANCE) {
          return {
            ...state,
            ludo: {
              ...l,
              positions,
              distance,
              winner: who,
              subphase: 'done',
              event: null,
              stats: { ...statsAfterBonus, endedAt: Date.now() },
            },
          }
        }
        return {
          ...state,
          ludo: {
            ...l,
            positions,
            distance,
            subphase: 'rolling',
            turn: who,
            event: null,
            stats: statsAfterBonus,
            log: [
              { t: Date.now(), text: `${who} matched the heart prompt +3` },
              ...l.log,
            ].slice(0, 6),
          },
        }
      }
      return {
        ...state,
        ludo: {
          ...l,
          subphase: 'rolling',
          turn: l.dice === 6 ? who : opp,
          event: null,
          log: [
            { t: Date.now(), text: `${who} missed the heart prompt` },
            ...l.log,
          ].slice(0, 6),
        },
      }
    }
    case 'LUDO_RESTART':
      return { ...state, ludo: initLudo(), phase: 'ludo' }
    case 'LUDO_BACK_TO_LOBBY':
      return { ...state, phase: 'lobby', ludo: null }
    default:
      return state
  }
}

export function useRoom() {
  const [mode, setMode] = useState('menu') // menu | hosting | joining
  const [role, setRole] = useState(null)
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState(INITIAL_STATE)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const channelRef = useRef(null)
  const stateRef = useRef(state)
  const roleRef = useRef(null)
  const meRef = useRef(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const broadcastState = useCallback((newState) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'state',
      payload: newState,
    })
  }, [])

  const applyLocally = useCallback((newState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  const dispatch = useCallback(
    (action) => {
      if (roleRef.current === 'host') {
        const newState = reduce(stateRef.current, action)
        applyLocally(newState)
        broadcastState(newState)
      } else {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'action',
          payload: action,
        })
      }
    },
    [applyLocally, broadcastState],
  )

  const tearDown = useCallback(async () => {
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current)
      } catch (e) {
        void e
      }
      channelRef.current = null
    }
  }, [])

  const leaveRoom = useCallback(async () => {
    await tearDown()
    roleRef.current = null
    meRef.current = null
    setMode('menu')
    setRole(null)
    setRoomCode('')
    setPartnerOnline(false)
    setState(INITIAL_STATE)
    setError('')
    setConnecting(false)
  }, [tearDown])

  const setupChannel = useCallback(
    (code, myRole, myPlayer) => {
      const channel = supabase.channel(`love_swap_${code}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: myPlayer.id },
        },
      })
      channelRef.current = channel
      roleRef.current = myRole
      meRef.current = myPlayer

      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (roleRef.current !== 'host') {
          applyLocally(payload)
        }
      })

      channel.on('broadcast', { event: 'action' }, ({ payload }) => {
        if (roleRef.current === 'host') {
          const newState = reduce(stateRef.current, payload)
          applyLocally(newState)
          broadcastState(newState)
        }
      })

      channel.on('presence', { event: 'sync' }, () => {
        const presences = channel.presenceState()
        const all = Object.values(presences).flat()
        const others = all.filter((p) => p.id !== meRef.current?.id)
        const hasPartner = others.length > 0
        setPartnerOnline(hasPartner)

        if (roleRef.current === 'host' && hasPartner) {
          const guest = others.find((p) => p.role === 'guest')
          if (guest) {
            const current = stateRef.current
            const guestChanged = current.players.guest?.id !== guest.id
            if (guestChanged) {
              const newState = reduce(current, {
                type: 'SET_GUEST',
                player: { id: guest.id, name: guest.name },
              })
              applyLocally(newState)
              broadcastState(newState)
            } else {
              broadcastState(current)
            }
          }
        }
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnecting(false)
          await channel.track({
            id: myPlayer.id,
            name: myPlayer.name,
            role: myRole,
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Connection error. Check internet or try again.')
        }
      })
    },
    [applyLocally, broadcastState],
  )

  const createRoom = useCallback(
    async (name, options = {}) => {
      if (!name.trim()) return null
      setError('')
      setConnecting(true)
      const code = options.code || generateRoomCode()
      const player = { id: generatePlayerId(), name: name.trim() }
      const visibility = options.visibility || 'private'
      const configOverride = options.config || {}
      setRoomCode(code)
      setRole('host')
      roleRef.current = 'host'
      setMode('hosting')
      applyLocally({
        ...INITIAL_STATE,
        visibility,
        config: { ...INITIAL_STATE.config, ...configOverride },
        players: { host: player, guest: null },
      })
      setupChannel(code, 'host', player)
      return code
    },
    [applyLocally, setupChannel],
  )

  const joinRoom = useCallback(
    async (name, code) => {
      if (!name.trim() || !code.trim()) return
      setError('')
      setConnecting(true)
      const cleanCode = code.trim().toUpperCase()
      const player = { id: generatePlayerId(), name: name.trim() }
      setRoomCode(cleanCode)
      setRole('guest')
      roleRef.current = 'guest'
      setMode('joining')
      setupChannel(cleanCode, 'guest', player)
    },
    [setupChannel],
  )

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // Unused helper so roleRef used is not flagged
  void advanceTurn

  const me = role === 'host' ? state.players.host : state.players.guest
  const partner = role === 'host' ? state.players.guest : state.players.host

  return {
    mode,
    role,
    roomCode,
    state,
    partnerOnline,
    connecting,
    error,
    me,
    partner,
    createRoom,
    joinRoom,
    leaveRoom,
    dispatch,
  }
}
