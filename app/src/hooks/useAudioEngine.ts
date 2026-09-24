import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { resolvePlayable } from "@/lib/stream";

/**
 * Single <audio> engine bound to the Zustand store. Resolves the playable URL
 * per source (async for SoundCloud), reconciles play/pause/volume, and exposes
 * the analyser node for the visualizer.
 */
export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const resolveTokenRef = useRef(0);

  const { index, queue, isPlaying, volume, muted } = usePlayer();
  const setPlaying = usePlayer((s) => s.setPlaying);
  const setProgress = usePlayer((s) => s.setProgress);
  const setDuration = usePlayer((s) => s.setDuration);
  const setLoading = usePlayer((s) => s.setLoading);
  const setError = usePlayer((s) => s.setError);
  const next = usePlayer((s) => s.next);

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
    const onErr = () => {
      setError("Не удалось воспроизвести трек");
      setLoading(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onErr);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onErr);
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

  // Resolve + load the current track when the index changes.
  useEffect(() => {
    const audio = audioRef.current;
    const track = index >= 0 ? queue[index] : null;
    if (!audio || !track) return;
    const key = `${track.source}:${track.id}`;
    if (loadedIdRef.current === key) return;

    const token = ++resolveTokenRef.current;
    loadedIdRef.current = key;
    setError(null);
    setLoading(true);

    (async () => {
      const url = await resolvePlayable(track);
      if (token !== resolveTokenRef.current) return; // superseded by a newer track
      setLoading(false);
      if (!url) {
        setError("Этот трек недоступен для воспроизведения");
        usePlayer.getState().next(true);
        return;
      }
      audio.src = url;
      audio.load();
      if (usePlayer.getState().isPlaying) {
        ensureAnalyser();
        void ctxRef.current?.resume();
        audio.play().catch(() => setPlaying(false));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue]);

  // Reconcile play/pause for the already-loaded source.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) {
      ensureAnalyser();
      void ctxRef.current?.resume();
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

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
