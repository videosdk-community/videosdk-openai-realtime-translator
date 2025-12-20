from __future__ import annotations

import time
from typing import Any, AsyncIterator, Optional
import os
import asyncio
import base64
import httpx
import wave
from datetime import datetime

# FIXED IMPORT: Changed from 'videosdk_handler.audio_stream' to your new 'custom_audio_track'
from custom_audio_track import CustomAudioStreamTrack

GOOGLE_TTS_SAMPLE_RATE = 24000
GOOGLE_TTS_CHANNELS = 1
GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize"


class GoogleTTS:
    def __init__(
        self,
        *,
        target_language_code: str = "en-US",
        voice_name: str = "en-US-Wavenet-D",
        speaking_rate: float = 1.0,
        pitch: float = 0.0,
        volume_gain_db: float = 0.0,
        api_key: str | None = None,
        audio_track: CustomAudioStreamTrack,
        loop: asyncio.AbstractEventLoop,
        queue: asyncio.Queue,
        save_audio_files: bool = True,
        audio_save_dir: str = "tts_audio_files",
    ) -> None:
        self.target_language_code = target_language_code
        self.voice_name = voice_name
        self.speaking_rate = speaking_rate
        self.pitch = pitch
        self.volume_gain_db = volume_gain_db
        self.audio_track = audio_track
        self.loop = loop
        self.save_audio_files = save_audio_files
        self.audio_save_dir = audio_save_dir

        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.publish_queue = queue

        if not self.api_key:
            raise ValueError(
                "Google API key required. Provide either:\n"
                "1. api_key parameter, OR\n"
                "2. GOOGLE_API_KEY environment variable"
            )

        self._http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=30.0, write=5.0, pool=5.0),
            follow_redirects=True,
        )
        
        # Create directory for saving audio files
        if self.save_audio_files:
            os.makedirs(self.audio_save_dir, exist_ok=True)

    async def synthesize(
        self, text: AsyncIterator[str] | str, target_language_code: Optional[str]
    ) -> None:
        try:
            if target_language_code:
                self.target_language_code = target_language_code
                self.voice_name = self._get_voice_for_language(target_language_code)
            
            if isinstance(text, AsyncIterator):
                full_text = ""
                async for chunk in text:
                    full_text += chunk
            else:
                full_text = text

            if not self.audio_track or not self.loop:
                print("error", "Audio track or loop not initialized")
                return

            await self._synthesize_audio(full_text)

        except Exception as e:
            print("error", f"Google TTS synthesis failed: {str(e)}")
            import traceback
            traceback.print_exc()

    def _get_voice_for_language(self, language_code: str) -> str:
        """Map language codes to appropriate Google TTS voices"""
        voice_mapping = {
            "en-US": "en-US-Wavenet-D",
            "en-GB": "en-GB-Wavenet-B",
            "en-AU": "en-AU-Wavenet-C",
            "en-CA": "en-CA-Wavenet-A",
            "en-IN": "en-IN-Wavenet-A",
            "hi-IN": "hi-IN-Wavenet-A",
            "gu-IN": "gu-IN-Wavenet-A",
            "ta-IN": "ta-IN-Wavenet-A",
            "bn-IN": "bn-IN-Wavenet-A",
            "kn-IN": "kn-IN-Wavenet-A",
            "ml-IN": "ml-IN-Wavenet-A",
            "mr-IN": "mr-IN-Wavenet-A",
            "or-IN": "or-IN-Wavenet-A",
            "pa-IN": "pa-IN-Wavenet-A",
            "te-IN": "te-IN-Wavenet-A",
            "es-ES": "es-ES-Wavenet-B",
            "es-MX": "es-MX-Wavenet-A",
            "es-AR": "es-AR-Wavenet-A",
            "fr-FR": "fr-FR-Wavenet-C",
            "fr-CA": "fr-CA-Wavenet-A",
            "de-DE": "de-DE-Wavenet-F",
            "it-IT": "it-IT-Wavenet-A",
            "pt-BR": "pt-BR-Wavenet-A",
            "pt-PT": "pt-PT-Wavenet-A",
        }
        return voice_mapping.get(language_code, "en-US-Wavenet-D")

    async def _synthesize_audio(self, text: str) -> None:
        try:
            url = f"{GOOGLE_TTS_ENDPOINT}?key={self.api_key}"
            
            payload = {
                "input": {"text": text},
                "voice": {
                    "languageCode": self.target_language_code,
                    "name": self.voice_name,
                },
                "audioConfig": {
                    "audioEncoding": "LINEAR16",
                    "sampleRateHertz": GOOGLE_TTS_SAMPLE_RATE,
                    "speakingRate": self.speaking_rate,
                    "pitch": self.pitch,
                    "volumeGainDb": self.volume_gain_db,
                }
            }

            headers = {"Content-Type": "application/json"}

            print(f"Synthesizing TTS for text: '{text[:100]}...'")
            response = await self._http_client.post(url, headers=headers, json=payload)
            response.raise_for_status()

            response_data = response.json()
            
            if "audioContent" not in response_data:
                print("error", "No audio data found in response from Google TTS")
                return

            audio_content = response_data["audioContent"]
            if not audio_content:
                print("error", "No audio content received from Google TTS")
                return

            audio_bytes = base64.b64decode(audio_content)

            if not audio_bytes:
                print("error", "Decoded audio bytes are empty")
                return

            if self.save_audio_files:
                await self._save_audio_file(text, audio_bytes)

            await self._stream_audio_chunks(audio_bytes)

        except httpx.HTTPStatusError as e:
            print(f"Google TTS HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            print(f"Error in TTS synthesis: {e}")
            import traceback
            traceback.print_exc()

    async def _save_audio_file(self, text: str, audio_bytes: bytes) -> None:
        """Save the full TTS audio to a WAV file for debugging"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_text = "".join(c for c in text[:50] if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_text = safe_text.replace(' ', '_')
            filename = f"tts_{timestamp}_{safe_text}.wav"
            filepath = os.path.join(self.audio_save_dir, filename)
            
            # FIXED TYPO: Changed 'waf_file' to 'wav_file' throughout
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(GOOGLE_TTS_CHANNELS)
                wav_file.setsampwidth(2)
                wav_file.setframerate(GOOGLE_TTS_SAMPLE_RATE)
                wav_file.writeframes(audio_bytes)
            
            print(f"Saved TTS audio to: {filepath}")
            print(f"  - Duration: {len(audio_bytes) / (GOOGLE_TTS_SAMPLE_RATE * GOOGLE_TTS_CHANNELS * 2):.2f} seconds")
            print(f"  - Size: {len(audio_bytes)} bytes")
            
        except Exception as e:
            print(f"Error saving audio file: {e}")

    async def _stream_audio_chunks(self, audio_bytes: bytes) -> None:
        chunk_size = int(GOOGLE_TTS_SAMPLE_RATE * GOOGLE_TTS_CHANNELS * 2 * 20 / 1000)
        
        print(f"TTS audio received: {len(audio_bytes)} bytes")
        print(f"Chunk size: {chunk_size} bytes")
        print(f"Expected sample rate: {GOOGLE_TTS_SAMPLE_RATE}Hz, Channels: {GOOGLE_TTS_CHANNELS}")
        
        total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
        print(f"Will send approximately {total_chunks} audio chunks")

        if self.save_audio_files:
            self._save_chunks_debug(audio_bytes, chunk_size)

        chunk_count = 0
        success_count = 0

        for i in range(0, len(audio_bytes), chunk_size):
            chunk = audio_bytes[i:i + chunk_size]
            chunk_count += 1

            if len(chunk) < chunk_size and len(chunk) > 0:
                padding_needed = chunk_size - len(chunk)
                chunk += b"\x00" * padding_needed

            if len(chunk) == chunk_size:
                print(f"Sending chunk {chunk_count}/{total_chunks}: {len(chunk)} bytes")
                try:
                    # FIXED: This already calls add_audio_data() correctly
                    await self.audio_track.add_audio_data(chunk)
                    success_count += 1
                    await asyncio.sleep(0.01)
                except Exception as e:
                    print(f"Error adding audio chunk to track: {e}")
                    print(f"Audio track type: {type(self.audio_track)}")
                    print(f"Audio track methods: {[m for m in dir(self.audio_track) if 'add' in m]}")
                    break

        print(f"TTS audio streaming completed. Sent {success_count}/{chunk_count} chunks successfully")

    def _save_chunks_debug(self, audio_bytes: bytes, chunk_size: int) -> None:
        """Save individual chunks for debugging"""
        try:
            chunks_dir = os.path.join(self.audio_save_dir, "chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            full_path = os.path.join(chunks_dir, f"full_{timestamp}.raw")
            with open(full_path, 'wb') as f:
                f.write(audio_bytes)
            print(f"Saved full raw audio to: {full_path}")
            
            # Save first few chunks
            for i in range(0, min(len(audio_bytes), chunk_size * 10), chunk_size):
                chunk = audio_bytes[i:i + chunk_size]
                chunk_path = os.path.join(chunks_dir, f"chunk_{i:06d}_{timestamp}.raw")
                with open(chunk_path, 'wb') as f:
                    f.write(chunk)
                
        except Exception as e:
            print(f"Error saving chunk debug files: {e}")

    async def aclose(self) -> None:
        if self._http_client:
            await self._http_client.aclose()

    async def interrupt(self) -> None:
        if self.audio_track:
            # Check if the method exists before calling
            if hasattr(self.audio_track, 'interrupt') and callable(self.audio_track.interrupt):
                self.audio_track.interrupt()