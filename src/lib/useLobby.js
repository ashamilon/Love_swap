import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

// Live public rooms listing. Hosts who opted into a public room announce
// themselves on a shared broadcast channel; everyone listening builds a
// live list with TTL. No database tables required.

const LOBBY_CHANNEL = 'love_swap_lobby'
const ANNOUNCE_EVERY_MS = 3500
const STALE_AFTER_MS = 9000

export function useLobby({ announce }) {
  // announce = null if not announcing, otherwise:
  //   { code, hostName, mode, spice, gameType }
  const [rooms, setRooms] = useState([])
  const channelRef = useRef(null)
  const announceRef = useRef(announce)
  const sweeperRef = useRef(null)
  const announcerRef = useRef(null)

  useEffect(() => {
    announceRef.current = announce
  }, [announce])

  // Subscribe once; keep alive across announce changes.
  useEffect(() => {
    const channel = supabase.channel(LOBBY_CHANNEL, {
      config: { broadcast: { self: false, ack: false } },
    })
    channelRef.current = channel

    channel.on('broadcast', { event: 'room' }, ({ payload }) => {
      if (!payload || !payload.code) return
      setRooms((prev) => {
        const without = prev.filter((r) => r.code !== payload.code)
        return [...without, { ...payload, seenAt: Date.now() }]
      })
    })

    channel.on('broadcast', { event: 'close' }, ({ payload }) => {
      if (!payload || !payload.code) return
      setRooms((prev) => prev.filter((r) => r.code !== payload.code))
    })

    channel.subscribe()

    sweeperRef.current = setInterval(() => {
      setRooms((prev) => prev.filter((r) => Date.now() - r.seenAt < STALE_AFTER_MS))
    }, 2000)

    announcerRef.current = setInterval(() => {
      const a = announceRef.current
      if (!a || !channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'room',
        payload: a,
      })
    }, ANNOUNCE_EVERY_MS)

    return () => {
      const a = announceRef.current
      if (a && channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'close',
            payload: { code: a.code },
          })
        } catch (e) { void e }
      }
      if (sweeperRef.current) clearInterval(sweeperRef.current)
      if (announcerRef.current) clearInterval(announcerRef.current)
      try { supabase.removeChannel(channel) } catch (e) { void e }
      channelRef.current = null
    }
  }, [])

  // Fire an immediate announcement whenever the payload changes.
  useEffect(() => {
    if (!announce || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'room',
      payload: announce,
    })
  }, [announce])

  const closeAnnouncement = useCallback((code) => {
    if (!code || !channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'close',
      payload: { code },
    })
  }, [])

  return { rooms, closeAnnouncement }
}
