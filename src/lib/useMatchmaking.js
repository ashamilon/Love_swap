import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, generatePlayerId, generateRoomCode } from './supabase.js'

// Matchmaking for stranger pairing.
//
// Every searching client joins a shared channel `love_swap_matchmaking`
// using Supabase Presence. When two or more searchers are present, the one
// with the lexicographically smaller id becomes the "inviter":
//   1. inviter generates a room code and broadcasts a 'pair' offer to the
//      other id.
//   2. the receiver accepts by broadcasting 'ack' with the code.
//   3. both clients leave the matchmaking channel and enter the room as
//      host (inviter) or guest (receiver).
//
// Uses no database; only Realtime presence + broadcast.

const MM_CHANNEL = 'love_swap_matchmaking'

function isBlocked(id) {
  try {
    const raw = localStorage.getItem('love_swap_blocked') || ''
    if (!raw) return false
    return raw.split(',').includes(id)
  } catch {
    return false
  }
}

export function blockStranger(id) {
  try {
    const raw = localStorage.getItem('love_swap_blocked') || ''
    const list = raw ? raw.split(',') : []
    if (!list.includes(id)) list.push(id)
    localStorage.setItem('love_swap_blocked', list.slice(-200).join(','))
  } catch { /* ignore */ }
}

export function useMatchmaking({ nickname, onMatched }) {
  const [status, setStatus] = useState('idle') // idle | searching | pairing | matched | failed
  const [waitingCount, setWaitingCount] = useState(0)
  const [error, setError] = useState('')

  const channelRef = useRef(null)
  const myIdRef = useRef('')
  const matchedRef = useRef(false)
  const onMatchedRef = useRef(onMatched)

  useEffect(() => { onMatchedRef.current = onMatched }, [onMatched])

  const teardown = useCallback(() => {
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current) } catch (e) { void e }
      channelRef.current = null
    }
    matchedRef.current = false
  }, [])

  const start = useCallback(() => {
    if (!nickname?.trim()) {
      setError('Nickname required')
      return
    }
    setError('')
    matchedRef.current = false
    const myId = generatePlayerId()
    myIdRef.current = myId

    const channel = supabase.channel(MM_CHANNEL, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: myId },
      },
    })
    channelRef.current = channel
    setStatus('searching')

    const tryPair = () => {
      if (matchedRef.current) return
      const presences = channel.presenceState()
      const all = Object.values(presences).flat()
      const valid = all.filter((p) => p.id && p.id !== myId && !isBlocked(p.id))
      setWaitingCount(valid.length)
      if (!valid.length) return

      valid.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
      const partner = valid[0]

      if (myId < partner.id) {
        const code = generateRoomCode()
        matchedRef.current = true
        setStatus('pairing')
        // Create the room FIRST, then tell the partner the code. This avoids a
        // race where the guest tries to join before the host's channel is up.
        onMatchedRef.current?.({
          role: 'host',
          code,
          partnerId: partner.id,
          partnerName: partner.nickname || 'Stranger',
        })
        setTimeout(() => {
          if (!channelRef.current) return
          channelRef.current.send({
            type: 'broadcast',
            event: 'pair',
            payload: { from: myId, to: partner.id, code, nickname: nickname.trim() },
          })
          setStatus('matched')
          setTimeout(() => teardown(), 600)
        }, 600)
      }
    }

    channel.on('presence', { event: 'sync' }, () => {
      tryPair()
    })

    channel.on('broadcast', { event: 'pair' }, ({ payload }) => {
      if (!payload || payload.to !== myIdRef.current) return
      if (matchedRef.current) return
      matchedRef.current = true
      setStatus('matched')
      channel.send({
        type: 'broadcast',
        event: 'ack',
        payload: { from: myIdRef.current, to: payload.from, code: payload.code },
      })
      onMatchedRef.current?.({
        role: 'guest',
        code: payload.code,
        partnerId: payload.from,
        partnerName: payload.nickname || 'Stranger',
      })
      teardown()
    })

    channel.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await channel.track({
          id: myId,
          nickname: nickname.trim(),
          joinedAt: Date.now(),
        })
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('failed')
        setError('Could not reach matchmaking. Check your internet.')
      }
    })
  }, [nickname, teardown])

  const stop = useCallback(() => {
    teardown()
    setStatus('idle')
    setWaitingCount(0)
  }, [teardown])

  useEffect(() => () => teardown(), [teardown])

  return { status, waitingCount, error, start, stop }
}
