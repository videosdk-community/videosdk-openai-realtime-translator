from __future__ import annotations

import asyncio
import io
import os
from typing import Any
import wave
import httpx
import numpy as np
import base64
import time

from videosdk import Participant

GOOGLE_STT_API_URL = "https://speech.googleapis.com/v1/speech:recognize"


class GoogleSTT:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        language: str = "en-US",
        input_sample_rate: int = 48000,
        output_sample_rate: int = 48000,
        silence_threshold: float = 0.01,
        silence_duration: float = 0.8,
        queue: asyncio.Queue,
    ) -> None:
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key must be provided either through api_key parameter or GOOGLE_API_KEY environment variable"
            )

        self.language = language
        self.input_sample_rate = input_sample_rate
        self.output_sample_rate = output_sample_rate
        self.silence_threshold_bytes = int(silence_threshold * 32767)
        self.silence_duration_frames = int(silence_duration * self.input_sample_rate)

        self._http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=30.0, write=5.0, pool=5.0)
        )
        self._audio_buffer = bytearray()
        self._is_speaking = False
        self._silence_frames = 0
        self._lock = asyncio.Lock()
        self.publish_queue = queue
        
        # Timing attributes
        self._first_speech_start_time = None
        self._transcription_complete_time = None

    async def process_audio(self, audio_frames: bytes, **kwargs: Any) -> None:
        async with self._lock:
            is_silent_chunk = self._is_silent(audio_frames)

            if not is_silent_chunk:
                if not self._is_speaking:
                    self._is_speaking = True
                    # Record the time when speech first starts
                    if self._first_speech_start_time is None:
                        self._first_speech_start_time = time.time()
                        print(f"#"*50)
                        print(f"speech_started at {self._first_speech_start_time}")
                    else:
                        print("speech_started")
                self._audio_buffer.extend(audio_frames)
                self._silence_frames = 0
            else:
                if self._is_speaking:
                    self._silence_frames += len(audio_frames) // 4
                    if self._silence_frames > self.silence_duration_frames:
                        print("speech_stopped")
                        asyncio.create_task(self._transcribe_buffer())
                        self._is_speaking = False
                        self._silence_frames = 0

    def _is_silent(self, audio_chunk: bytes) -> bool:
        """Simple VAD: check if the max amplitude is below a threshold."""
        audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
        return np.max(np.abs(audio_data)) < self.silence_threshold_bytes

    async def _transcribe_buffer(self, _audio_buffer: bytearray, source_language_code):
        audio_to_send = _audio_buffer
        transcription_start_time = time.time()

        try:
            print("stt transcribe", source_language_code)
            # Update language code for Google STT
            self.language = source_language_code
            wav_audio = self._create_wav_in_memory(audio_to_send)
            
            # Convert audio to base64 for Google API
            audio_base64 = base64.b64encode(wav_audio.getvalue()).decode('utf-8')

            # Google Speech-to-Text API request
            request_data = {
                "config": {
                    "encoding": "LINEAR16",
                    "sampleRateHertz": self.output_sample_rate,
                    "languageCode": self.language,
                    "enableAutomaticPunctuation": True,
                    "model": "command_and_search"
                },
                "audio": {
                    "content": audio_base64
                }
            }

            url = f"{GOOGLE_STT_API_URL}?key={self.api_key}"
            send_start = time.time()
            response = await self._http_client.post(url, json=request_data)
            send_end = time.time()

            total_time = send_end - send_start
            
            print("#"*50, "TOTOAL TIME TAKE BY STT REQUEST")
            print(total_time)
            print("#"*50)

            response.raise_for_status()

            response_data = response.json()
            
            # Record transcription completion time
            self._transcription_complete_time = time.time()
            transcription_duration = self._transcription_complete_time - transcription_start_time
            print("="*50)
            print("response_data", response_data)
            
            # Extract transcript from Google API response
            if "results" in response_data and len(response_data["results"]) > 0:
                transcript = response_data["results"][0]["alternatives"][0]["transcript"]
                
                # Calculate and log timing metrics
                if self._first_speech_start_time is not None:
                    total_time = self._transcription_complete_time - self._first_speech_start_time
                    print(f"#"*50)
                    print(f"⏱️  TIMING METRICS:")
                    print(f"   - Time from first speech to transcription: {total_time:.3f}s")
                    print(f"   - Transcription API call duration: {transcription_duration:.3f}s")
                    print(f"   - Transcript: '{transcript}'")
                    print(f"#"*50)

                    
                    # Reset for next conversation
                    self._first_speech_start_time = None
                
                return transcript
            else:
                print(f"No transcription results. API call took {transcription_duration:.3f}s")
                return ""

        except httpx.HTTPStatusError as e:
            print(
                "error",
                f"Google STT API error: {e.response.status_code} - {e.response.text}",
            )
            return ""
        except Exception as e:
            print("error", f"Error during transcription: {e}")
            return ""

    def _create_wav_in_memory(self, pcm_data: bytes) -> io.BytesIO:
        # Convert stereo PCM data to mono
        # Assuming 16-bit samples (2 bytes per sample)
        audio_data = np.frombuffer(pcm_data, dtype=np.int16)
        
        # Reshape to stereo (2 channels)
        stereo_samples = audio_data.reshape(-1, 2)
        
        # Convert stereo to mono by averaging left and right channels
        mono_samples = np.mean(stereo_samples, axis=1).astype(np.int16)
        
        # Convert back to bytes
        mono_pcm_data = mono_samples.tobytes()
        
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # 16-bit samples
            wf.setframerate(self.output_sample_rate)
            wf.writeframes(mono_pcm_data)
        wav_buffer.seek(0)
        
        # Temporarily save to file for debugging
        import tempfile
        import os
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_file.write(wav_buffer.getvalue())
        temp_file.close()
        print(f"Temporary WAV file saved: {temp_file.name}")
        
        # Reset buffer position for return
        wav_buffer.seek(0)
        return wav_buffer

    async def aclose(self) -> None:
        if self._is_speaking and self._audio_buffer:
            await asyncio.sleep(1)

        if self._http_client:
            await self._http_client.aclose()