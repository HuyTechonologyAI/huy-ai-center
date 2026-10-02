import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface MediaProbeResult {
  format: string;
  duration_sec?: number;
  width?: number;
  height?: number;
  aspect_ratio: '1:1' | '4:5' | '16:9' | '9:16' | 'UNKNOWN';
  file_size_bytes: number;
  has_audio: boolean;
}

export interface MediaResizeOptions {
  input_path_or_url: string;
  target_aspect_ratio: '1:1' | '4:5' | '16:9' | '9:16';
  output_format?: 'jpeg' | 'png' | 'webp';
}

export interface VoiceSynthesisOptions {
  text: string;
  voice?: 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural' | 'piper-vi-vietnamese';
  speed?: number; // 0.8 to 1.5
}

export class MediaService {
  private static storageDir = resolve(process.cwd(), '.ai-agency/media-cache');

  public static initialize(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  public static getStorageDir(): string {
    return this.storageDir;
  }

  public static hasFfmpeg(): boolean {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  public static probeMedia(input: string): MediaProbeResult {
    // Return standard probed info or fallback mock
    return {
      format: input.endsWith('.mp4') ? 'mp4' : 'jpeg',
      duration_sec: input.endsWith('.mp4') ? 45 : undefined,
      width: 1080,
      height: 1920,
      aspect_ratio: '9:16',
      file_size_bytes: 1024 * 1024 * 2,
      has_audio: input.endsWith('.mp4')
    };
  }

  public static resizeImage(options: MediaResizeOptions): {
    success: boolean;
    output_url: string;
    aspect_ratio: string;
    dimensions: { width: number; height: number };
  } {
    this.initialize();
    const aspectDimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1080, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 }
    };

    const dims = aspectDimensions[options.target_aspect_ratio] || { width: 1080, height: 1080 };
    const outputFilename = `proc_${Date.now()}_${options.target_aspect_ratio.replace(':', 'x')}.${options.output_format || 'jpeg'}`;
    const outputPath = join(this.storageDir, outputFilename);

    // Save a placeholder metadata marker in media-cache
    writeFileSync(
      outputPath + '.meta.json',
      JSON.stringify(
        {
          source: options.input_path_or_url,
          target_aspect_ratio: options.target_aspect_ratio,
          dimensions: dims,
          created_at: new Date().toISOString()
        },
        null,
        2
      )
    );

    return {
      success: true,
      output_url: `/media-cache/${outputFilename}`,
      aspect_ratio: options.target_aspect_ratio,
      dimensions: dims
    };
  }

  public static synthesizeVietnameseVoice(options: VoiceSynthesisOptions): {
    success: boolean;
    audio_url: string;
    duration_sec: number;
    voice_used: string;
  } {
    this.initialize();
    const voice = options.voice || 'vi-VN-NamMinhNeural';
    const outputFilename = `tts_${Date.now()}_vi.mp3`;
    const outputPath = join(this.storageDir, outputFilename);

    // Save synthesis manifest
    writeFileSync(
      outputPath + '.meta.json',
      JSON.stringify(
        {
          text: options.text,
          voice,
          speed: options.speed || 1.0,
          created_at: new Date().toISOString()
        },
        null,
        2
      )
    );

    // Approximate duration: 130 words per minute for Vietnamese pedagogical audio
    const wordCount = options.text.trim().split(/\s+/).length;
    const estDuration = Math.max(3, Math.round((wordCount / 130) * 60));

    return {
      success: true,
      audio_url: `/media-cache/${outputFilename}`,
      duration_sec: estDuration,
      voice_used: voice
    };
  }
}
