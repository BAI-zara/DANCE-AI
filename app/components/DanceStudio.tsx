"use client"

import PayPalButton from "./PayPalButton";
import Link from "next/link"
import { type DragEvent, useEffect, useRef, useState } from "react"
import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision"

type Clip = {
  id: string
  name: string
  order: number
  startTime: number
  duration: number
  frames: Array<PoseFrame>
  trimStartFrame: number
  trimEndFrame: number
}

type Landmark = { x: number; y: number; z?: number; visibility?: number }
type PoseFrame = {
  timestamp: number
  poses: Array<Array<Landmark>>
}
type DanceMode = 'crazy' | 'calm'
type PoseDetectionResult = {
  landmarks?: Array<Array<Landmark>>
  poseLandmarks?: Array<Array<Landmark>>
}

const PLAYBACK_FPS = 30

export default function DanceStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isReplaying, setIsReplaying] = useState(false)
  const [recordedFrameCount, setRecordedFrameCount] = useState(0)
  const [recordedClips, setRecordedClips] = useState<Clip[]>([])
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null)
  const [exportedVideoFilename, setExportedVideoFilename] = useState("clip.webm")
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0)
  const [playbackDurationMs, setPlaybackDurationMs] = useState(0)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [playbackClipCount, setPlaybackClipCount] = useState(0)
  const [currentPlayingClipId, setCurrentPlayingClipId] = useState<string | null>(null)
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [mode, setMode] = useState<DanceMode>('calm')
  const modeRef = useRef<DanceMode>('calm')
  const smoothingRef = useRef(0.3)

  const recordingRef = useRef(false)
  const replayRef = useRef(false)
  const playbackRef = useRef(false)
  const playbackIndexRef = useRef(0)
  const playbackStartedAtRef = useRef(0)
  const playbackPositionRef = useRef(0)
  const recordingStartedAtRef = useRef(0)
  const recordedFramesRef = useRef<Array<PoseFrame>>([])
  const clipIdRef = useRef(1)
  const playingClipsRef = useRef<Clip[]>([])
  const currentClipIndexRef = useRef(0)
  const currentPlayingClipIdRef = useRef<string | null>(null)
  const currentFrameIndexRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const exportedVideoUrlRef = useRef<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const renderLoopActiveRef = useRef(false)
  const trailHistoryRef = useRef<Array<Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>>>([])
  const previousSmoothedRef = useRef<Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>>([])
  const lastRenderModeRef = useRef<DanceMode>('calm')
  const lastPlayheadUpdateRef = useRef(0)
  const playbackDurationRef = useRef(0)
  const lastPlaybackStepRef = useRef(0)
  const pendingPlaybackPositionMsRef = useRef<number | null>(null)
  const playbackFinishedInLoopRef = useRef(false)
  const suppressClipClickRef = useRef(false)

  const normalizeLandmarks = (landmarks: Array<Landmark>) =>
    landmarks.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
      visibility: point.visibility ?? 1,
    }))

  const getClipDurationFromFrames = (frameCount: number) =>
    frameCount / PLAYBACK_FPS

  const getTimelineDurationSeconds = (clips: Array<Clip>) =>
    clips.reduce((duration, clip) => Math.max(duration, clip.startTime + clip.duration), 0)

  const getSequenceDurationMs = (sequenceClips: Array<Clip>) =>
    getTimelineDurationSeconds(sequenceClips) * 1000

  const getOrderedClips = (clips: Array<Clip>) =>
    [...clips].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

  const normalizeClipTimeline = (clips: Array<Clip>) => {
    let nextStartTime = 0

    return getOrderedClips(clips).map((clip, index) => {
      const nextClip = {
        ...clip,
        order: index + 1,
        startTime: nextStartTime,
      }
      nextStartTime += clip.duration
      return nextClip
    })
  }

  const findTimelineClipAtTime = (clips: Array<Clip>, currentTime: number) => {
    const clipIndex = clips.findIndex(
      (clip) => currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
    )

    return {
      clip: clipIndex >= 0 ? clips[clipIndex] : null,
      clipIndex,
    }
  }

  const getTrimmedFrames = (clip: Clip) => {
    if (!clip.frames.length) return []
    const start = Math.max(0, Math.min(clip.trimStartFrame, clip.frames.length - 1))
    const end = Math.max(start + 1, Math.min(clip.trimEndFrame, clip.frames.length))
    const frames = clip.frames.slice(start, end)
    const firstTimestamp = frames[0]?.timestamp ?? 0

    return frames.map((frame) => ({
      timestamp: frame.timestamp - firstTimestamp,
      poses: frame.poses.map((pose) => pose.map((point) => ({ ...point }))),
    }))
  }

  const getPlayableClip = (clip: Clip): Clip => {
    const frames = getTrimmedFrames(clip)
    return {
      ...clip,
      frames,
      duration: getClipDurationFromFrames(frames.length),
      trimStartFrame: 0,
      trimEndFrame: frames.length,
    }
  }

  const formatDuration = (milliseconds: number) => `${(milliseconds / 1000).toFixed(1)}s`
  const formatSeconds = (seconds: number) => `${seconds.toFixed(1)}s`

  const smoothLandmarks = (
    currentLandmarks: Array<{ x: number; y: number; z?: number; visibility?: number }>,
    poseIndex: number
  ) => {
    const alpha = smoothingRef.current // 骞虫粦鍥犲瓙锛?-1锛岃秺楂樿秺鍝嶅簲
    const previous = previousSmoothedRef.current[poseIndex]

    if (!previous || previous.length !== currentLandmarks.length) {
      // 棣栨鎴栭暱搴︿笉鍖归厤锛岀洿鎺ヤ娇鐢ㄥ綋鍓?      previousSmoothedRef.current[poseIndex] = currentLandmarks.map((point) => ({ ...point }))
      return [...currentLandmarks]
    }

    const smoothed: Array<{ x: number; y: number; z?: number; visibility?: number }> = []

    for (let i = 0; i < currentLandmarks.length; i++) {
      const current = currentLandmarks[i]
      const prev = previous[i]

      if (!current || !prev) {
        smoothed.push({ ...current })
        continue
      }

      // 鎸囨暟绉诲姩骞冲潎
      const smoothedX = alpha * current.x + (1 - alpha) * prev.x
      const smoothedY = alpha * current.y + (1 - alpha) * prev.y
      const smoothedZ = alpha * (current.z ?? 0) + (1 - alpha) * (prev.z ?? 0)
      const smoothedVisibility = alpha * (current.visibility ?? 1) + (1 - alpha) * (prev.visibility ?? 1)

      smoothed.push({
        x: smoothedX,
        y: smoothedY,
        z: smoothedZ,
        visibility: smoothedVisibility
      })
    }

    previousSmoothedRef.current[poseIndex] = smoothed.map((point) => ({ ...point }))
    return smoothed
  }

  const stopPlayback = () => {
    replayRef.current = false
    playbackRef.current = false
    playbackIndexRef.current = 0
    playbackStartedAtRef.current = 0
    playbackPositionRef.current = 0
    playingClipsRef.current = []
    currentClipIndexRef.current = 0
    currentPlayingClipIdRef.current = null
    currentFrameIndexRef.current = 0
    lastPlayheadUpdateRef.current = 0
    lastPlaybackStepRef.current = 0
    pendingPlaybackPositionMsRef.current = null
    playbackFinishedInLoopRef.current = false
    playbackDurationRef.current = 0
    setPlaybackPositionMs(0)
    setPlaybackDurationMs(0)
    setCurrentClipIndex(0)
    setPlaybackClipCount(0)
    setCurrentPlayingClipId(null)
    setIsReplaying(false)
  }

  const startPlayback = (sequenceClips: Array<Clip>) => {
    const timelineClips = normalizeClipTimeline(sequenceClips)
    if (!timelineClips.length) return
    trailHistoryRef.current = []
    playingClipsRef.current = timelineClips
    currentClipIndexRef.current = 0
    currentFrameIndexRef.current = 0
    playbackIndexRef.current = 0
    playbackStartedAtRef.current = 0
    playbackPositionRef.current = 0
    lastPlayheadUpdateRef.current = 0
    lastPlaybackStepRef.current = 0
    pendingPlaybackPositionMsRef.current = null
    playbackFinishedInLoopRef.current = false
    playbackDurationRef.current = getSequenceDurationMs(timelineClips)
    setPlaybackPositionMs(0)
    setPlaybackDurationMs(playbackDurationRef.current)
    setCurrentClipIndex(0)
    setPlaybackClipCount(timelineClips.length)
    setCurrentPlayingClipId(timelineClips[0]?.id ?? null)
    currentPlayingClipIdRef.current = timelineClips[0]?.id ?? null
    replayRef.current = true
    playbackRef.current = true
    setIsReplaying(true)
  }

  const handleRecordToggle = () => {
    if (replayRef.current) return

    if (recordingRef.current) {
      recordingRef.current = false
      setIsRecording(false)
      setRecordedFrameCount(recordedFramesRef.current.length)
      if (!recordedFramesRef.current.length) return

      const clipNumber = clipIdRef.current
      clipIdRef.current += 1
      const newClip: Clip = {
        id: `clip-${clipNumber}`,
        name: `Clip ${clipNumber}`,
        order: recordedClips.length + 1,
        startTime: 0,
        duration: getClipDurationFromFrames(recordedFramesRef.current.length),
        frames: [...recordedFramesRef.current],
        trimStartFrame: 0,
        trimEndFrame: recordedFramesRef.current.length,
      }
      setRecordedClips(prev => normalizeClipTimeline([...prev, { ...newClip, order: prev.length + 1 }]))
    } else {
      recordedFramesRef.current = []
      playbackIndexRef.current = 0
      recordingStartedAtRef.current = 0
      recordingRef.current = true
      setIsRecording(true)
      setRecordedFrameCount(0)
    }
  }

  const handlePlayback = () => {
    if (recordingRef.current) {
      recordingRef.current = false
      setIsRecording(false)
      setRecordedFrameCount(recordedFramesRef.current.length)
    }

    if (!recordedFramesRef.current.length || replayRef.current) return

    startPlayback([{
      id: 'temp',
      name: 'temp',
      order: 1,
      startTime: 0,
      duration: getClipDurationFromFrames(recordedFramesRef.current.length),
      frames: recordedFramesRef.current,
      trimStartFrame: 0,
      trimEndFrame: recordedFramesRef.current.length,
    }])
  }

  const handleProgressSeek = (positionMs: number) => {
    const clips = playingClipsRef.current
    if (!clips.length) return

    const nextPositionMs = Math.max(0, Math.min(positionMs, playbackDurationRef.current))
    const currentTime = nextPositionMs / 1000
    const { clip, clipIndex } = findTimelineClipAtTime(clips, currentTime)
    const frameIndex = clip
      ? Math.min(Math.floor((currentTime - clip.startTime) * PLAYBACK_FPS), Math.max(0, clip.frames.length - 1))
      : 0

    pendingPlaybackPositionMsRef.current = nextPositionMs
    playbackPositionRef.current = nextPositionMs
    currentClipIndexRef.current = clipIndex
    playbackIndexRef.current = frameIndex
    currentFrameIndexRef.current = frameIndex
    lastPlaybackStepRef.current = 0
    currentPlayingClipIdRef.current = clip?.id ?? null
    setCurrentClipIndex(Math.max(0, clipIndex))
    setCurrentPlayingClipId(clip?.id ?? null)
    setPlaybackPositionMs(nextPositionMs)
  }

  const playClip = (clip: Clip) => {
    if (recordingRef.current || replayRef.current) return
    startPlayback([getPlayableClip(clip)])
  }

  const playOrderedClips = () => {
    if (recordingRef.current || replayRef.current) return
    const clips = getOrderedClips(recordedClips).map(getPlayableClip)
    startPlayback(clips)
  }

  const handleTimelineClipClick = (clip: Clip) => {
    if (suppressClipClickRef.current) {
      suppressClipClickRef.current = false
      return
    }

    playClip(clip)
  }

  const handleTimelineClipDragStart = (id: string, event: DragEvent<HTMLDivElement>) => {
    if (recordingRef.current || replayRef.current) return

    suppressClipClickRef.current = true
    setDraggedClipId(id)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", id)
  }

  const handleTimelineClipDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (recordingRef.current || replayRef.current) return

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  const handleTimelineClipDrop = (targetId: string, event: DragEvent<HTMLDivElement>) => {
    if (recordingRef.current || replayRef.current) return

    event.preventDefault()
    const sourceId = draggedClipId ?? event.dataTransfer.getData("text/plain")
    if (!sourceId || sourceId === targetId) {
      setDraggedClipId(null)
      return
    }

    setRecordedClips((prev) => {
      const ordered = normalizeClipTimeline(prev)
      const sourceIndex = ordered.findIndex((clip) => clip.id === sourceId)
      const targetIndex = ordered.findIndex((clip) => clip.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return ordered

      const next = [...ordered]
      ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
      return normalizeClipTimeline(next.map((clip, index) => ({ ...clip, order: index + 1 })))
    })
    setDraggedClipId(null)
  }

  const handleModeChange = (nextMode: DanceMode) => () => {
    setMode(nextMode)
    modeRef.current = nextMode
    trailHistoryRef.current = []
    previousSmoothedRef.current = []
  }

  const startVideoRecording = () => {
    if (typeof window === "undefined") return

    const canvas = particleCanvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    try {
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
        exportedVideoUrlRef.current = null
      }
      setExportedVideoUrl(null)

      const stream = canvas.captureStream(30)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const filename = `clip-${Date.now()}.webm`
        exportedVideoUrlRef.current = url
        setExportedVideoUrl(url)
        setExportedVideoFilename(filename)
        recordedChunksRef.current = []
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecordingVideo(true)
    } catch (error) {
      console.error('Failed to start video recording:', error)
      setErrorMessage('视频录制启动失败')
    }
  }

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecordingVideo(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return

    let poseLandmarker: PoseLandmarker | null = null
    let stream: MediaStream | null = null
    let activeVideo: HTMLVideoElement | null = null
    let mounted = true
    renderLoopActiveRef.current = true

    const playbackUiSyncId = window.setInterval(() => {
      if (playbackFinishedInLoopRef.current) {
        stopPlayback()
        return
      }

      if (!playbackRef.current) return

      setPlaybackPositionMs(playbackPositionRef.current)
      setCurrentClipIndex(Math.max(0, currentClipIndexRef.current))
      setCurrentPlayingClipId(currentPlayingClipIdRef.current)
    }, 100)

    const getLandmarks = (result: PoseDetectionResult | undefined) => {
      if (!result) return []
      return result.landmarks ?? result.poseLandmarks ?? []
    }

    const resizeCanvas = (
      video: HTMLVideoElement,
      particleCanvas: HTMLCanvasElement
    ) => {
      if (video.videoWidth && video.videoHeight) {
        const width = video.videoWidth
        const height = video.videoHeight
        if (particleCanvas.width !== width || particleCanvas.height !== height) {
          particleCanvas.width = width
          particleCanvas.height = height
        }
      }
    }

    const fadeParticleLayer = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity = 0.98) => {
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
      ctx.fillRect(0, 0, width, height)
    }

    const drawGlowParticle = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      index: number
    ) => {
      const hue = 170 + (index * 12) % 80
      const radius = 8 + ((index % 4) * 2) // 澧炲ぇ绮掑瓙澶у皬浠ユ彁楂樻竻鏅板害
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      ctx.shadowBlur = 28 // 澧炲己闃村奖鏁堟灉
      ctx.shadowColor = `hsla(${hue}, 100%, 80%, 0.45)`
      ctx.fillStyle = `hsla(${hue}, 90%, 70%, 0.4)`
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawSkeletonLines = (
      ctx: CanvasRenderingContext2D,
      landmarks: Array<Landmark>,
      width: number,
      height: number,
      alpha: number = 1,
      thickness: number = 2.5
    ) => {
      const connections = PoseLandmarker.POSE_CONNECTIONS
      ctx.save()
      ctx.lineWidth = thickness
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.globalAlpha = alpha
      for (const connection of connections) {
        const startPoint = landmarks[connection.start]
        const endPoint = landmarks[connection.end]
        if (!startPoint || !endPoint) continue
        // 缁樺埗杞粨浠ュ寮烘竻鏅板害
        ctx.strokeStyle = `rgba(0,0,0,${0.5 * alpha})`
        ctx.lineWidth = thickness + 2
        ctx.beginPath()
        ctx.moveTo(startPoint.x * width, startPoint.y * height)
        ctx.lineTo(endPoint.x * width, endPoint.y * height)
        ctx.stroke()
        // 缁樺埗涓荤嚎
        ctx.strokeStyle = `rgba(255,255,255, ${0.95 * alpha})`
        ctx.lineWidth = thickness
        ctx.beginPath()
        ctx.moveTo(startPoint.x * width, startPoint.y * height)
        ctx.lineTo(endPoint.x * width, endPoint.y * height)
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawTrail = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      const trailFrames = trailHistoryRef.current
      const maxTrail = 8 // 杞ㄨ抗甯ф暟

      for (let i = 0; i < Math.min(trailFrames.length, maxTrail); i++) {
        const frame = trailFrames[i]
        const alpha = (maxTrail - i) / maxTrail * 0.4 // 閫愭笎娣″寲

        if (Array.isArray(frame) && frame.length) {
          for (const landmarks of frame) {
            if (Array.isArray(landmarks) && landmarks.length) {
              drawSkeletonLines(ctx, landmarks, width, height, alpha, 4.5)
            }
          }
        }
      }
    }

    const getParticleLandmarks = (landmarks: Array<Landmark>) =>
      landmarks.filter((_, index) =>
        index % 3 === 0 || [0, 11, 12, 23, 24].includes(index)
      )

    const drawLandmarkPoints = (
      ctx: CanvasRenderingContext2D,
      landmarks: Array<Landmark>,
      width: number,
      height: number
    ) => {
      ctx.save()
      for (let index = 0; index < landmarks.length; index++) {
        const point = landmarks[index]
        if (!point) continue
        const x = point.x * width
        const y = point.y * height
        ctx.beginPath()
        ctx.fillStyle = "rgba(255,255,255, 0.95)"
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "rgba(0, 0, 0, 0.7)"
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
    }

    const syncPlayhead = (positionMs: number, now: number) => {
      if (now - lastPlayheadUpdateRef.current < 40) return
      lastPlayheadUpdateRef.current = now
      playbackPositionRef.current = Math.max(0, Math.min(positionMs, playbackDurationRef.current || positionMs))
    }

    const renderLoop = (particleCtx: CanvasRenderingContext2D) => {
      if (!mounted || !renderLoopActiveRef.current) return

      const video = videoRef.current
      const particleCanvas = particleCanvasRef.current
      if (!video || !particleCanvas) {
        animationFrameRef.current = requestAnimationFrame(() => renderLoop(particleCtx))
        return
      }

      const width = particleCanvas.width
      const height = particleCanvas.height
      const currentMode = modeRef.current

      if (lastRenderModeRef.current !== currentMode) {
        particleCtx.clearRect(0, 0, width, height)
        if (currentMode === 'crazy') {
          particleCtx.fillStyle = 'black'
          particleCtx.fillRect(0, 0, width, height)
        }
        trailHistoryRef.current = []
        lastRenderModeRef.current = currentMode
      }

      const prepareCanvasFrame = () => {
        if (currentMode === 'crazy') {
          particleCtx.fillStyle = 'rgba(0, 0, 0, 0.16)'
          particleCtx.fillRect(0, 0, width, height)
        } else {
          particleCtx.clearRect(0, 0, width, height)
        }
      }

      const drawCrazyFrame = (landmarks: Array<Landmark>) => {
        drawSkeletonLines(particleCtx, landmarks, width, height, 1, 4)
        const points = getParticleLandmarks(landmarks)
        points.forEach((point, idx) => {
          drawGlowParticle(particleCtx, point.x * width, point.y * height, idx)
        })
      }

      const drawCalmFrame = (landmarks: Array<Landmark>) => {
        drawSkeletonLines(particleCtx, landmarks, width, height, 1, 6)
        drawLandmarkPoints(particleCtx, landmarks, width, height)
      }

      if (playbackRef.current) {
        if (playingClipsRef.current.length > 0) {
          const now = performance.now()
          if (!playbackStartedAtRef.current) {
            playbackStartedAtRef.current = now
          }

          if (pendingPlaybackPositionMsRef.current !== null) {
            playbackStartedAtRef.current = now - pendingPlaybackPositionMsRef.current
            pendingPlaybackPositionMsRef.current = null
          }

          const currentPositionMs = now - playbackStartedAtRef.current

          if (currentPositionMs >= playbackDurationRef.current) {
            syncPlayhead(playbackDurationRef.current, now + 100)
            replayRef.current = false
            playbackRef.current = false
            playbackFinishedInLoopRef.current = true
          }

          const currentTime = currentPositionMs / 1000
          const { clip, clipIndex } = findTimelineClipAtTime(playingClipsRef.current, currentTime)
          if (clip && clip.frames.length > 0) {
            if (currentClipIndexRef.current !== clipIndex) {
              currentClipIndexRef.current = clipIndex
              currentPlayingClipIdRef.current = clip.id
            }

            const clipTime = Math.max(0, currentTime - clip.startTime)
            const frameIndex = Math.min(
              Math.floor(clipTime * PLAYBACK_FPS),
              Math.max(0, clip.frames.length - 1)
            )
            const frame = clip.frames[frameIndex]
            playbackIndexRef.current = frameIndex
            currentFrameIndexRef.current = frameIndex
            prepareCanvasFrame()

            if (frame && Array.isArray(frame.poses) && frame.poses.length) {
              for (const landmarks of frame.poses) {
                if (Array.isArray(landmarks) && landmarks.length) {
                  if (currentMode === 'crazy') {
                    drawCrazyFrame(landmarks)
                  } else {
                    drawCalmFrame(landmarks)
                  }
                }
              }
            }

            syncPlayhead(currentPositionMs, now)
          } else {
            prepareCanvasFrame()
            syncPlayhead(currentPositionMs, now)
            currentPlayingClipIdRef.current = null
          }
        } else {
          replayRef.current = false
          playbackRef.current = false
          playbackFinishedInLoopRef.current = true
        }
      } else {
        if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
          prepareCanvasFrame()

          const frameTime = performance.now()
          const result = poseLandmarker?.detectForVideo(video, frameTime)
          const landmarksList = getLandmarks(result)

          if (Array.isArray(landmarksList)) {
            const smoothedFrame: Array<Array<Landmark>> = []

            for (let poseIndex = 0; poseIndex < landmarksList.length; poseIndex++) {
              const rawLandmarks = landmarksList[poseIndex]
              if (Array.isArray(rawLandmarks) && rawLandmarks.length) {
                const normalizedLandmarks = normalizeLandmarks(rawLandmarks)
                const smoothedLandmarks = smoothLandmarks(normalizedLandmarks, poseIndex)
                smoothedFrame.push(smoothedLandmarks)

                if (currentMode === 'crazy') {
                  trailHistoryRef.current.push([smoothedLandmarks])
                  if (trailHistoryRef.current.length > 10) {
                    trailHistoryRef.current.shift()
                  }
                  drawTrail(particleCtx, width, height)
                  drawCrazyFrame(smoothedLandmarks)
                } else {
                  drawCalmFrame(smoothedLandmarks)
                }
              }
            }

            if (recordingRef.current && smoothedFrame.length) {
              if (!recordingStartedAtRef.current) {
                recordingStartedAtRef.current = frameTime
              }
              recordedFramesRef.current.push({
                timestamp: frameTime - recordingStartedAtRef.current,
                poses: smoothedFrame.map((pose) => pose.map((point) => ({ ...point }))),
              })
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(() =>
        renderLoop(particleCtx)
      )
    }

    const init = async () => {
      const video = videoRef.current
      const particleCanvas = particleCanvasRef.current
      if (!video || !particleCanvas) return
      activeVideo = video

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        )

        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          },
          runningMode: "VIDEO",
        })

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })

        const currentVideo = videoRef.current
        const currentCanvas = particleCanvasRef.current
        if (!currentVideo || !currentCanvas || !renderLoopActiveRef.current) return
        activeVideo = currentVideo

        currentVideo.srcObject = stream
        currentVideo.muted = true
        currentVideo.playsInline = true

        const particleCtx = currentCanvas.getContext("2d")
        if (!particleCtx) throw new Error("无法获取粒子画布上下文")

        const start = () => {
          const activeVideoElement = videoRef.current
          const activeCanvasElement = particleCanvasRef.current
          if (!activeVideoElement || !activeCanvasElement || !renderLoopActiveRef.current) return

          resizeCanvas(activeVideoElement, activeCanvasElement)
          activeVideoElement.play().catch(() => {})
          fadeParticleLayer(particleCtx, activeCanvasElement.width, activeCanvasElement.height)
          renderLoop(particleCtx)
        }

        if (currentVideo.readyState >= HTMLMediaElement.HAVE_METADATA) {
          start()
        } else {
          currentVideo.addEventListener("loadedmetadata", start, { once: true })
        }
      } catch (error) {
        console.error(error)
        if (!mounted) return
        setErrorMessage(error instanceof Error ? error.message : String(error))
      }
    }

    init()

    return () => {
      mounted = false
      renderLoopActiveRef.current = false
      playbackRef.current = false
      replayRef.current = false
      window.clearInterval(playbackUiSyncId)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (poseLandmarker?.close) poseLandmarker.close()
      if (activeVideo) {
        activeVideo.srcObject = null
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (exportedVideoUrlRef.current) {
        URL.revokeObjectURL(exportedVideoUrlRef.current)
        exportedVideoUrlRef.current = null
      }
    }
  }, [])

  const orderedRecordedClips = normalizeClipTimeline(recordedClips)

  return (
    <main className="product-page">
      <header className="product-header">
        <Link href="/" className="product-logo" aria-label="Dance AI home">
          <span className="logo-mark">DA</span>
          <span>
            <strong>Dance AI</strong>
            <small>AI Dance Analyzer</small>
          </span>
        </Link>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="#pro">Pro</a>
          <a href="#features">Features</a>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">AI Dance Analyzer</span>
          <h1 id="hero-title">Record, analyze, and export dance motion with AI.</h1>
          <p>
            A clean studio for real-time pose tracking, replayable movement clips,
            and paid Pro exports.
          </p>
        </div>

        <div className="stage-card card">
          {errorMessage ? <p className="simple-error">{errorMessage}</p> : null}
          <div className="stage">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={mode === 'crazy' ? "video-hidden" : "video-visible"}
            />
            <canvas ref={particleCanvasRef} />
          </div>

          <div className="hero-action-row">
            <button
              type="button"
              onClick={handleRecordToggle}
              disabled={isReplaying}
              className={`primary-record-button ${isRecording ? "danger" : ""}`}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
            <span className="simple-status">
              {isRecording
                ? "Recording..."
                : recordedFrameCount
                  ? `${recordedFrameCount} frames captured`
                  : "Ready to record"}
              {isReplaying ? ` · ${formatDuration(playbackPositionMs)} / ${formatDuration(playbackDurationMs)}` : ""}
              {isReplaying && playbackClipCount > 1 ? ` · Clip ${currentClipIndex + 1}/${playbackClipCount}` : ""}
            </span>
          </div>

          <section className="mode-controls" aria-label="Visual mode">
            <span className="simple-label">Mode</span>
            <button
              type="button"
              onClick={handleModeChange('calm')}
              className={`secondary-button ${mode === 'calm' ? "active" : ""}`}
            >
              Calm
            </button>
            <button
              type="button"
              onClick={handleModeChange('crazy')}
              className={`secondary-button ${mode === 'crazy' ? "active" : ""}`}
            >
              Energy
            </button>
          </section>
        </div>
      </section>

      <section className="controls-section card" aria-label="Clip controls">
        <div className="simple-controls">
          <button
            type="button"
            onClick={handlePlayback}
            disabled={isRecording || isReplaying || !recordedFrameCount}
            className="simple-pill"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={playOrderedClips}
            disabled={isRecording || isReplaying || !orderedRecordedClips.length}
            className="simple-pill"
          >
            Play All
          </button>
          <button
            type="button"
            onClick={stopPlayback}
            disabled={!isReplaying}
            className="simple-pill muted-button"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
            className={`simple-pill ${isRecordingVideo ? "danger" : ""}`}
          >
            {isRecordingVideo ? "Stop Export" : "Export Video"}
          </button>
          {exportedVideoUrl ? (
            <a
              href={exportedVideoUrl}
              download={exportedVideoFilename}
              className="simple-download-link"
            >
              Download Video
            </a>
          ) : null}
        </div>

        <div className="simple-progress">
          <span>{formatDuration(playbackPositionMs)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, playbackDurationMs)}
            value={Math.min(playbackPositionMs, Math.max(1, playbackDurationMs))}
            onChange={(event) => handleProgressSeek(Number(event.target.value))}
            disabled={!isReplaying || playbackDurationMs <= 0}
          />
          <span>{formatDuration(playbackDurationMs)}</span>
        </div>
      </section>

      <section className="timeline-section card" aria-label="Timeline">
        <div className="section-heading">
          <span>Timeline</span>
          <small>{orderedRecordedClips.length} clips</small>
        </div>
        <div className="simple-timeline">
          {orderedRecordedClips.length ? orderedRecordedClips.map((clip) => (
            <div
              key={clip.id}
              className={[
                "simple-timeline-clip",
                currentPlayingClipId === clip.id ? "playing" : "",
                draggedClipId === clip.id ? "dragging" : "",
              ].filter(Boolean).join(" ")}
              draggable={!isRecording && !isReplaying}
              onClick={() => handleTimelineClipClick(clip)}
              onDragStart={(event) => handleTimelineClipDragStart(clip.id, event)}
              onDragOver={handleTimelineClipDragOver}
              onDrop={(event) => handleTimelineClipDrop(clip.id, event)}
              onDragEnd={() => setDraggedClipId(null)}
            >
              <span>{clip.order}</span>
              <small>{formatSeconds(clip.duration)}</small>
            </div>
          )) : (
            <p className="empty-timeline">Recorded clips appear here.</p>
          )}
        </div>
      </section>

      <section id="pro" className="cta-section card" aria-labelledby="pro-title">
        <div className="cta-copy">
          <span className="eyebrow">Unlock Pro - $5</span>
          <h2 id="pro-title">Unlock Pro Features</h2>
          <p>Get full access to AI analysis, polished exports, and creator-ready workflow tools.</p>
        </div>
        <div className="paypal-panel">
          <PayPalButton />
        </div>
      </section>

      <section id="features" className="features-section" aria-label="Features">
        <article className="feature-card card">
          <span>01</span>
          <h3>Real-time tracking</h3>
          <p>Follow movement instantly through the live camera preview.</p>
        </article>
        <article className="feature-card card">
          <span>02</span>
          <h3>AI pose detection</h3>
          <p>Detect body landmarks with MediaPipe-powered pose analysis.</p>
        </article>
        <article className="feature-card card">
          <span>03</span>
          <h3>Export video</h3>
          <p>Save shareable WebM clips from your AI movement session.</p>
        </article>
      </section>

      <footer className="product-footer">
        <span>Dance AI</span>
        <nav aria-label="Legal links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/refund">Refund Policy</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </footer>
    </main>
  )
}

