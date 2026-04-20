import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

// WebRTC voice chat between the two players.
// Signaling runs over a separate Supabase Realtime channel so it doesn't
// interfere with the game state channel. Audio travels peer-to-peer.
export function useVoice({ roomCode, role }) {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('idle')
  // idle | requesting | waiting | connecting | connected | muted | denied | failed
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const channelRef = useRef(null)
  const audioRef = useRef(null)
  const partnerReadyRef = useRef(false)
  const offerSentRef = useRef(false)
  const isInitiatorRef = useRef(false)

  const teardown = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close() } catch (e) { void e }
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current) } catch (e) { void e }
      channelRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
    partnerReadyRef.current = false
    offerSentRef.current = false
    setMuted(false)
    setStatus('idle')
  }, [])

  const enable = useCallback(async () => {
    if (!roomCode || !role) return
    setError('')
    try {
      setStatus('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      localStreamRef.current = stream

      const isInitiator = role === 'host'
      isInitiatorRef.current = isInitiator

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0]
          const playPromise = audioRef.current.play?.()
          if (playPromise && playPromise.catch) playPromise.catch(() => {})
        }
      }

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState
        if (s === 'connected') {
          setStatus((prev) => (prev === 'muted' ? 'muted' : 'connected'))
        } else if (s === 'failed' || s === 'disconnected') {
          setStatus('failed')
        }
      }

      const channel = supabase.channel(`love_swap_voice_${roomCode}`, {
        config: { broadcast: { self: false, ack: false } },
      })
      channelRef.current = channel

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice',
            payload: event.candidate.toJSON(),
          })
        }
      }

      const tryOffer = async () => {
        if (!isInitiatorRef.current) return
        if (offerSentRef.current) return
        if (!partnerReadyRef.current) return
        offerSentRef.current = true
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          setStatus('connecting')
          channel.send({ type: 'broadcast', event: 'offer', payload: offer })
        } catch (e) {
          console.error('voice offer failed', e)
          setStatus('failed')
        }
      }

      channel.on('broadcast', { event: 'ready' }, () => {
        partnerReadyRef.current = true
        tryOffer()
      })

      channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (isInitiatorRef.current) return
        try {
          setStatus('connecting')
          await pc.setRemoteDescription(payload)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'answer', payload: answer })
        } catch (e) {
          console.error('voice answer failed', e)
          setStatus('failed')
        }
      })

      channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (!isInitiatorRef.current) return
        try {
          await pc.setRemoteDescription(payload)
        } catch (e) {
          console.error('voice setRemote failed', e)
        }
      })

      channel.on('broadcast', { event: 'ice' }, async ({ payload }) => {
        try {
          await pc.addIceCandidate(payload)
        } catch (e) {
          void e
        }
      })

      channel.subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setEnabled(true)
          setStatus('waiting')
          const announce = () => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'ready',
              payload: {},
            })
          }
          announce()
          setTimeout(announce, 400)
          setTimeout(announce, 1200)
          setTimeout(announce, 2500)
        }
      })
    } catch (e) {
      console.error('voice enable failed', e)
      setError(e?.message || 'Voice error')
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setStatus('denied')
      } else {
        setStatus('failed')
      }
      teardown()
    }
  }, [roomCode, role, teardown])

  const disable = useCallback(() => {
    teardown()
    setEnabled(false)
  }, [teardown])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !muted
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next
    })
    setMuted(next)
    setStatus((prev) => {
      if (prev === 'connected' && next) return 'muted'
      if (prev === 'muted' && !next) return 'connected'
      return prev
    })
  }, [muted])

  // When room changes or unmounts, tear down fully.
  useEffect(() => {
    return () => teardown()
  }, [teardown, roomCode])

  return {
    enabled,
    status,
    muted,
    error,
    enable,
    disable,
    toggleMute,
    audioRef,
  }
}
