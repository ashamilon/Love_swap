import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, generatePlayerId, generateRoomCode } from './supabase.js'
import { buildQuestionPool } from '../data/questions.js'
import { getSimilarity, pointsFromSimilarity } from '../utils/scoring.js'
import { reactionFor } from '../utils/reactions.js'

export const TRACK_SIZE = 24
export const HEART_CELLS = [3, 9, 15, 21]
export const START_CELLS = { host: 0, guest: 12 }
export const WIN_DISTANCE = TRACK_SIZE

const CAPTURE_DARES = [
  { text: "You're caught! Blow a kiss and snap a selfie of it.", kind: 'photo' },
  { text: "Gotcha! Say one thing you love about them out loud.", kind: 'voice' },
  { text: "Captured! Bite your lip and send a cute selfie.", kind: 'photo' },
  { text: "Busted! Whisper their name like you mean it.", kind: 'voice' },
  { text: "Caught red-handed! Promise one sweet thing for later, out loud.", kind: 'voice' },
  { text: "Caught! Flash a heart sign with your hands in a selfie.", kind: 'photo' },
  { text: "Busted! Send a pouty selfie to show who's boss.", kind: 'photo' },
  { text: "Gotcha! Give them a compliment in your most flirty voice.", kind: 'voice' },
]

function randomDare() {
  return CAPTURE_DARES[Math.floor(Math.random() * CAPTURE_DARES.length)]
}

function pickHeartQuestion(config) {
  const pool = buildQuestionPool(config.mode, Number(config.spice), 1)
  return pool[0]
}

export const INITIAL_STATE = {
  phase: 'lobby',
  gameType: 'questions', // 'questions' | 'ludo'
  config: { mode: 'flirty', spice: 3, rounds: 5, doublePoints: true },
  players: { host: null, guest: null },

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

function advanceTurn(ludo, who) {
  const opp = who === 'host' ? 'guest' : 'host'
  return { ...ludo, turn: opp, subphase: 'rolling', dice: ludo.dice }
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

  // Win check
  if (newDistance >= WIN_DISTANCE) {
    return {
      ...state,
      ludo: { ...ludo, dice, positions, distance, winner: who, subphase: 'done', log },
    }
  }

  // Capture
  if (newPos === ludo.positions[opp]) {
    positions[opp] = START_CELLS[opp]
    distance[opp] = 0
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
      },
    }
  }

  // Heart cell
  if (HEART_CELLS.includes(newPos)) {
    const question = pickHeartQuestion(state.config)
    const isChoice = question.type === 'choice'
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
      return {
        ...state,
        ludo: { ...l, event: { ...l.event, photo: action.dataUrl } },
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
      return {
        ...state,
        ludo: {
          ...l,
          event: {
            ...l.event,
            matched: Boolean(action.matched),
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
      return {
        ...state,
        ludo: {
          ...l,
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
    async (name) => {
      if (!name.trim()) return
      setError('')
      setConnecting(true)
      const code = generateRoomCode()
      const player = { id: generatePlayerId(), name: name.trim() }
      setRoomCode(code)
      setRole('host')
      roleRef.current = 'host'
      setMode('hosting')
      applyLocally({
        ...INITIAL_STATE,
        players: { host: player, guest: null },
      })
      setupChannel(code, 'host', player)
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
