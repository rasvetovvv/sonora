import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { streamUrl } from "@/lib/api";

/**
 * Single <audio> engine bound to the Zustand store. One instance lives at the
 * app root; every control mutates the store and this hook reconciles the
 * element. Returns the analyser node for the visualizer.
 */
export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const { index, queue, isPlaying, volume, muted } = usePlayer();
  const setPlaying = usePlayer((s) => s.setPlaying);
  const setProgress = usePlayer((s) => s.setProgress);
  const setDuration = usePlayer((s) => s.setDuration);
  const next = usePlayer((s) => s.next);

  // Create the element + WebAudio graph once.
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => next(true);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazily build the analyser on first user-initiated play (autoplay policy).
  const ensureAnalyser = () => {
    if (ctxRef.current || !audioRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      /* analyser is optional eye-candy; ignore failures */
    }
  };

  // Load the current track when the index changes.
  useEffect(() => {
    const audio = audioRef.current;
    const track = index >= 0 ? queue[index] : null;
    if (!audio || !track) return;
    if (loadedIdRef.current !== track.id) {
      audio.src = streamUrl(track.id);
      loadedIdRef.current = track.id;
      audio.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue]);

  // Reconcile play/pause.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !loadedIdRef.current) return;
    if (isPlaying) {
      ensureAnalyser();
      void ctxRef.current?.resume();
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, index]);

  // Volume / mute.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const seek = (t: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setProgress(t);
    }
  };

  return { seek, analyser: analyserRef };
}
