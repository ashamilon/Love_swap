import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, generatePlayerId, generateRoomCode } from './supabase.js'
import { buildQuestionPool } from '../data/questions.js'
import { getSimilarity, pointsFromSimilarity } from '../utils/scoring.js'
import { reactionFor } from '../utils/reactions.js'

export const INITIAL_STATE = {
  phase: 'lobby',
  config: { mode: 'flirty', spice: 3, rounds: 5, doublePoints: true },
  players: { host: null, guest: null },
  turns: [],
  turnIndex: 0,
  answerText: '',
  guessText: '',
  similarity: 0,
  points: 0,
  reaction: '',
  scores: { host: 0, guest: 0 },
  results: {},
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

function reduce(state, action) {
  switch (action.type) {
    case 'SET_GUEST':
      return { ...state, players: { ...state.players, guest: action.player } }
    case 'UPDATE_CONFIG':
      if (state.phase !== 'lobby') return state
      return { ...state, config: { ...state.config, ...action.config } }
    case 'START_GAME':
      if (!state.players.guest) return state
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
      }
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
