"use client";

import { useCallback, useRef, useState } from "react";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    samples.push(audioBuffer.getChannelData(ch));
  }

  const dataLength = samples[0].length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples[0].length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, samples[ch][i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function createSilenceBuffer(
  ctx: OfflineAudioContext,
  durationSec: number,
  sampleRate: number,
  channels: number,
): AudioBuffer {
  const length = Math.ceil(durationSec * sampleRate);
  return ctx.createBuffer(channels, length, sampleRate);
}

function concatBuffers(
  ctx: OfflineAudioContext,
  buffers: AudioBuffer[],
): AudioBuffer {
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const sampleRate = buffers[0].sampleRate;
  const channels = buffers[0].numberOfChannels;
  const result = ctx.createBuffer(channels, totalLength, sampleRate);

  let offset = 0;
  for (const buf of buffers) {
    for (let ch = 0; ch < channels; ch++) {
      const dest = result.getChannelData(ch);
      const src = buf.getChannelData(ch);
      dest.set(src, offset);
    }
    offset += buf.length;
  }

  return result;
}

export default function AudioCombinerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [delay, setDelay] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalDuration, setOriginalDuration] = useState<number | null>(null);
  const [pdrDuration, setPdrDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdrAudioRef = useRef<HTMLAudioElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("audio/")) {
      setError("Файл повинен бути аудіо");
      return;
    }
    setFile(f);
    setError(null);
    setResultUrl(null);

    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      setOriginalDuration(audio.duration);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const process = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      const offlineCtx = new OfflineAudioContext(2, 1, 44100);

      const [userArrayBuffer, pdrArrayBuffer] = await Promise.all([
        file.arrayBuffer(),
        fetch("/PDR_PRODUCTION_SOUND.mp3").then((r) => r.arrayBuffer()),
      ]);

      const [userBuffer, pdrBuffer] = await Promise.all([
        offlineCtx.decodeAudioData(userArrayBuffer),
        offlineCtx.decodeAudioData(pdrArrayBuffer),
      ]);

      setPdrDuration(pdrBuffer.duration);

      const silence = createSilenceBuffer(
        offlineCtx,
        delay,
        userBuffer.sampleRate,
        userBuffer.numberOfChannels,
      );

      const finalBuffer = concatBuffers(offlineCtx, [userBuffer, silence, pdrBuffer]);

      const renderCtx = new OfflineAudioContext(
        finalBuffer.numberOfChannels,
        finalBuffer.length,
        finalBuffer.sampleRate,
      );

      const source = renderCtx.createBufferSource();
      source.buffer = finalBuffer;
      source.connect(renderCtx.destination);
      source.start(0);

      const rendered = await renderCtx.startRendering();
      const wavBlob = encodeWAV(rendered);
      const url = URL.createObjectURL(wavBlob);
      setResultUrl(url);
    } catch {
      setError("Помилка обробки аудіо. Спробуй інший файл.");
    } finally {
      setProcessing(false);
    }
  }, [file, delay]);

  const download = useCallback(() => {
    if (!resultUrl || !file) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}_pdr.wav`;
    a.click();
  }, [resultUrl, file]);

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`card-dark p-8 border-2 border-dashed cursor-pointer transition-colors text-center ${
          dragOver
            ? "border-on-primary"
            : "border-hairline-dark hover:border-on-primary-mute"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div>
            <p className="button-cap text-on-primary mb-1">{file.name}</p>
            {originalDuration !== null && (
              <p className="text-on-primary-mute text-sm">
                {formatTime(originalDuration)} / {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="button-cap text-on-primary mb-2">ЗАВАНТАЖ АУДІО</p>
            <p className="text-on-primary-mute text-sm">
              Перетягни файл сюди або клікни
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Delay control */}
      {file && (
        <div className="card-dark p-6 space-y-4">
          <div>
            <label className="button-cap text-on-primary block mb-3">
              ЗАТРИМКА ПЕРЕД PDR: {delay.toFixed(1)}с
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={0.1}
              value={delay}
              onChange={(e) => setDelay(parseFloat(e.target.value))}
              className="w-full accent-white cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-on-primary-mute text-xs">0с</span>
              <span className="text-on-primary-mute text-xs">30с</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={300}
              step={0.1}
              value={delay}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setDelay(Math.max(0, Math.min(300, v)));
              }}
              className="w-24 px-3 py-2 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary text-sm focus:outline-none focus:border-on-primary-mute"
            />
            <span className="text-on-primary-mute text-sm">секунд</span>
          </div>
        </div>
      )}

      {/* PDR preview */}
      {file && (
        <div className="card-dark p-6">
          <p className="button-cap text-on-primary mb-3">PDRзвук (превʼю)</p>
          <audio
            ref={pdrAudioRef}
            src="/PDR_PRODUCTION_SOUND.mp3"
            controls
            className="w-full"
            onLoadedMetadata={() => {
              if (pdrAudioRef.current) setPdrDuration(pdrAudioRef.current.duration);
            }}
          />
          {pdrDuration !== null && (
            <p className="text-on-primary-mute text-xs mt-2">
              Тривалість: {formatTime(pdrDuration)}
            </p>
          )}
        </div>
      )}

      {/* Process button */}
      {file && (
        <button
          onClick={process}
          disabled={processing}
          className="btn-ghost text-on-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full inline-block" />
              ОБРОБКА...
            </span>
          ) : (
            "ОБРОБИТИ"
          )}
        </button>
      )}

      {/* Result */}
      {resultUrl && (
        <div className="card-dark p-6 space-y-4">
          <p className="button-cap text-on-primary">РЕЗУЛЬТАТ</p>
          <audio src={resultUrl} controls className="w-full" />
          {originalDuration !== null && pdrDuration !== null && (
            <p className="text-on-primary-mute text-sm">
              Загальна тривалість: {formatTime(originalDuration + delay + pdrDuration)}
            </p>
          )}
          <button onClick={download} className="btn-ghost text-on-primary">
            ЗАВАНТАЖИТИ WAV
          </button>
        </div>
      )}
    </div>
  );
}
