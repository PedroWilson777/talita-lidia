import OpenAI from 'openai';
import { Buffer } from 'buffer';

// Lazy initialization — evita crash na inicialização se OPENAI_API_KEY não estiver configurada
let _openai = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/**
 * Transcreve um áudio em base64 usando OpenAI Whisper
 */
export async function transcribeAudio(base64Audio) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY não configurada. Transcrição ignorada.');
    return '[Áudio recebido, mas IA de áudio não configurada]';
  }

  try {
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    
    // O SDK da OpenAI precisa de um File/Blob/Stream nomeado
    // Como estamos no backend (Node.js/Edge), usamos o File API ou um buffer customizado
    const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt',
    });

    return transcription.text;
  } catch (error) {
    console.error('Erro na transcrição de áudio:', error);
    return '[Erro ao transcrever áudio]';
  }
}

/**
 * Converte texto para áudio usando OpenAI TTS
 * Retorna uma string em base64
 */
export async function textToSpeech(text) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const mp3 = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // ou 'nova', 'shimmer', 'echo', 'fable', 'onyx'
      input: text,
      response_format: 'mp3'
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString('base64');
  } catch (error) {
    console.error('Erro na síntese de voz:', error);
    return null;
  }
}
