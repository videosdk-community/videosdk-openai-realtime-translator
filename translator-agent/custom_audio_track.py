"""
CustomAudioStreamTrack for VideoSDK
Fixed version: Removes read-only 'samples' attribute assignment
"""

import asyncio
import time
import fractions
import wave
import os
from datetime import datetime
from typing import Optional

import numpy as np
from av import AudioFrame
from videosdk import CustomAudioTrack


class CustomAudioStreamTrack(CustomAudioTrack):
    """Custom audio track that buffers and streams TTS audio to VideoSDK."""

    def __init__(self, save_debug_audio: bool = False, debug_dir: str = "audio_debug"):
        """
        Initialize the custom audio track.

        Args:
            save_debug_audio: If True, save audio chunks to files for debugging
            debug_dir: Directory to save debug audio files
        """
        super().__init__()

        # Audio format configuration (must match Google TTS output)
        self.sample_rate = 24000      # 24kHz sample rate
        self.channels = 1             # Mono audio
        self.sample_width = 2         # 16-bit audio (2 bytes per sample)
        
        # Audio frame configuration (20ms frames standard for real-time audio)
        self.samples_per_frame = int(0.02 * self.sample_rate)  # 480 samples per 20ms frame
        self.frame_duration = 0.02    # 20ms
        
        # Timing and state
        self._start_time: Optional[float] = None
        self._timestamp = 0
        self.time_base = fractions.Fraction(1, self.sample_rate)
        
        # Audio buffering
        self.frame_buffer = []        # Buffered AudioFrame objects ready to send
        self.raw_buffer = bytearray() # Raw bytes waiting to be converted to frames
        
        # Debugging
        self.save_debug_audio = save_debug_audio
        self.debug_dir = debug_dir
        self.chunk_counter = 0
        
        if self.save_debug_audio:
            os.makedirs(self.debug_dir, exist_ok=True)
            print(f"Debug audio will be saved to: {os.path.abspath(self.debug_dir)}")

    # -------------------------------------------------------------------------
    # Public API Methods
    # -------------------------------------------------------------------------

    async def add_audio_data(self, audio_bytes: bytes) -> None:
        """
        Add raw audio bytes to the track's buffer.
        Called by TTS when new audio is generated.

        Args:
            audio_bytes: Raw PCM audio bytes (16-bit, mono, 24kHz)
        """
        if not audio_bytes:
            return

        # Save for debugging if enabled
        if self.save_debug_audio:
            self._save_debug_chunk(audio_bytes)

        # Add to raw buffer
        self.raw_buffer.extend(audio_bytes)
        
        # Convert raw bytes to audio frames
        self._convert_raw_to_frames()
        
        # Log buffer status occasionally
        if len(self.frame_buffer) % 50 == 0 and len(self.frame_buffer) > 0:
            print(f"Audio buffer: {len(self.frame_buffer)} frames, "
                  f"{len(self.raw_buffer)} raw bytes pending")

    async def recv(self) -> AudioFrame:
        """Core VideoSDK method: Called to get the next audio frame."""
        # Ensure track is live
        if self.readyState != "live":
            print(f"❌ Track not live. State: {self.readyState}")
            raise RuntimeError("Audio track is not in 'live' state")

        # Initialize timing on first call
        if self._start_time is None:
            self._start_time = time.time()
            self._timestamp = 0
            print("🎵 Audio track started streaming (recv called for first time)")

        # Get or create a frame
        if self.frame_buffer:
            frame = self.frame_buffer.pop(0)
            print(f"🎤 Sending audio frame. Buffer: {len(self.frame_buffer)} frames left")
        else:
            # Send silence if no audio is available
            frame = self._create_silence_frame()
            # print("🔇 Sending silence frame (buffer empty)")

        # Maintain real-time playback timing
        self._timestamp += self.samples_per_frame
        
        # Calculate if we need to wait to maintain real-time pacing
        expected_time = self._start_time + (self._timestamp / self.sample_rate)
        wait_time = expected_time - time.time()
        
        if wait_time > 0:
            await asyncio.sleep(wait_time)

        # Set frame metadata required by VideoSDK
        frame.pts = self._timestamp
        frame.time_base = self.time_base

        return frame

    async def cleanup(self) -> None:
        """Clean up resources and stop the track."""
        print("Cleaning up audio track...")
        
        # Save any remaining audio for debugging
        if self.save_debug_audio and (self.raw_buffer or self.frame_buffer):
            self._save_remaining_audio()
        
        # Clear buffers
        self.frame_buffer.clear()
        self.raw_buffer.clear()
        
        # Stop the track
        self.stop()
        print("Audio track cleanup complete")

    # -------------------------------------------------------------------------
    # Internal Processing Methods
    # -------------------------------------------------------------------------

    def _convert_raw_to_frames(self) -> None:
        """Convert raw bytes in buffer to AudioFrame objects."""
        bytes_needed = self.samples_per_frame * self.channels * self.sample_width
        
        while len(self.raw_buffer) >= bytes_needed:
            # Extract exactly enough bytes for one frame
            chunk = self.raw_buffer[:bytes_needed]
            self.raw_buffer = self.raw_buffer[bytes_needed:]
            
            # Convert to numpy array (16-bit integers)
            samples = np.frombuffer(chunk, dtype=np.int16)
            
            # Reshape for AudioFrame: (channels, samples_per_frame)
            if self.channels == 1:
                audio_data = samples.reshape(1, -1)  # Mono: (1, N)
                layout = 'mono'
            else:
                audio_data = samples.reshape(2, -1)  # Stereo: (2, N)
                layout = 'stereo'
            
            # Create AudioFrame
            frame = AudioFrame.from_ndarray(audio_data, format='s16', layout=layout)
            # DO NOT set frame.samples - it's read-only
            # frame.sample_rate = self.sample_rate  # Already set by from_ndarray? Let's set it anyway
            frame.sample_rate = self.sample_rate
            
            self.frame_buffer.append(frame)

    def _create_silence_frame(self) -> AudioFrame:
        """Create a frame of silence."""
        silent_samples = np.zeros((self.channels, self.samples_per_frame), dtype=np.int16)
        frame = AudioFrame.from_ndarray(silent_samples, format='s16', 
                                        layout='mono' if self.channels == 1 else 'stereo')
        frame.sample_rate = self.sample_rate
        # DO NOT set frame.samples - it's read-only
        return frame

    # -------------------------------------------------------------------------
    # Debugging Methods
    # -------------------------------------------------------------------------

    def _save_debug_chunk(self, audio_bytes: bytes) -> None:
        """Save a chunk of audio to a WAV file for debugging."""
        try:
            self.chunk_counter += 1
            timestamp = datetime.now().strftime("%H%M%S")
            filename = f"chunk_{self.chunk_counter:04d}_{timestamp}.wav"
            filepath = os.path.join(self.debug_dir, filename)
            
            # FIXED: Changed 'waf_file' to 'wav_file'
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(self.sample_width)
                wav_file.setframerate(self.sample_rate)  # This line sets the sampling rate
                wav_file.writeframes(audio_bytes)
                
            if self.chunk_counter % 10 == 1:  # Log first and every 10th
                print(f"Saved debug audio: {filename} ({len(audio_bytes)} bytes)")
                
        except Exception as e:
            print(f"Failed to save debug audio: {e}")

    def _save_remaining_audio(self) -> None:
        """Save any remaining audio in buffers before cleanup."""
        try:
            if not self.raw_buffer:
                return
                
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"remaining_audio_{timestamp}.wav"
            filepath = os.path.join(self.debug_dir, filename)
            
            # FIXED: Changed 'waf_file' to 'wav_file'
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(self.sample_width)
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(self.raw_buffer)
                
            print(f"Saved remaining audio: {filename} ({len(self.raw_buffer)} bytes)")
            
        except Exception as e:
            print(f"Failed to save remaining audio: {e}")

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def get_buffer_status(self) -> dict:
        """Get current buffer status for monitoring."""
        return {
            'frame_buffer_size': len(self.frame_buffer),
            'raw_buffer_bytes': len(self.raw_buffer),
            'buffered_seconds': len(self.frame_buffer) * self.frame_duration,
            'sample_rate': self.sample_rate,
            'channels': self.channels,
            'ready_state': self.readyState
        }

    def clear_buffers(self) -> None:
        """Clear all audio buffers."""
        self.frame_buffer.clear()
        self.raw_buffer.clear()
        print("Audio buffers cleared")