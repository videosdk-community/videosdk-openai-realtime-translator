import asyncio
from fractions import Fraction
from time import time
import traceback
from av import AudioFrame
import numpy as np
import wave
import os
from datetime import datetime
from videosdk import CustomAudioTrack

AUDIO_PTIME = 0.02


class MediaStreamError(Exception):
    pass


class CustomAudioStreamTrack(CustomAudioTrack):
    def __init__(self, loop, save_output_files: bool = True, output_save_dir: str = "audio_output"):
        super().__init__()
        self.loop = loop
        self._start = None
        self._timestamp = 0
        self.frame_buffer = []
        self.audio_data_buffer = bytearray()
        self.frame_time = 0
        self.sample_rate = 24000
        self.channels = 1
        self.sample_width = 2
        self.time_base_fraction = Fraction(1, self.sample_rate)
        self.samples = int(AUDIO_PTIME * self.sample_rate)
        self.chunk_size = int(self.samples * self.channels * self.sample_width)
        
        # For saving output
        self.save_output_files = save_output_files
        self.output_save_dir = output_save_dir
        self.output_buffer = bytearray()
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if self.save_output_files:
            os.makedirs(self.output_save_dir, exist_ok=True)

    def interrupt(self):
        # Save current buffer before clearing
        if self.save_output_files and len(self.output_buffer) > 0:
            self._save_output_buffer()
        
        self.frame_buffer.clear()
        self.audio_data_buffer.clear()
        self.output_buffer.clear()

    async def add_new_bytes(self, audio_data: bytes):
        print(f"add_new_bytes: Received {len(audio_data)} bytes")
        
        # Save to output buffer for file saving
        if self.save_output_files:
            self.output_buffer.extend(audio_data)
        
        self.audio_data_buffer += audio_data

        while len(self.audio_data_buffer) >= self.chunk_size:
            chunk = self.audio_data_buffer[: self.chunk_size]
            self.audio_data_buffer = self.audio_data_buffer[self.chunk_size :]
            try:
                audio_frame = self.buildAudioFrames(chunk)
                self.frame_buffer.append(audio_frame)
                print(f"Created audio frame, buffer now has {len(self.frame_buffer)} frames")
            except Exception as e:
                print(f"Error building audio frame: {e}")
                break

    def buildAudioFrames(self, chunk: bytes) -> AudioFrame:
        if len(chunk) != self.chunk_size:
            print(
                f"Warning: Incorrect chunk size received {len(chunk)}, expected {self.chunk_size}"
            )

        data = np.frombuffer(chunk, dtype=np.int16)
        expected_samples = self.samples * self.channels
        if len(data) != expected_samples:
            print(
                f"Warning: Incorrect number of samples in chunk {len(data)}, expected {expected_samples}"
            )

        data = data.reshape(-1, self.channels)
        layout = "mono" if self.channels == 1 else "stereo"

        audio_frame = AudioFrame.from_ndarray(data.T, format="s16", layout=layout)
        return audio_frame

    def next_timestamp(self):
        pts = int(self.frame_time)
        time_base = self.time_base_fraction
        self.frame_time += self.samples
        return pts, time_base

    async def recv(self) -> AudioFrame:
        try:
            if self.readyState != "live":
                print("Audio track not in 'live' state")
                raise MediaStreamError

            if self._start is None:
                self._start = time()
                self._timestamp = 0
                print(f"Audio track started at {self._start}")
            else:
                self._timestamp += self.samples

            wait = self._start + (self._timestamp / self.sample_rate) - time()

            if wait > 0:
                await asyncio.sleep(wait)

            pts, time_base = self.next_timestamp()

            if len(self.frame_buffer) > 0:
                frame = self.frame_buffer.pop(0)
                print(f"Sending audio frame, remaining buffer: {len(self.frame_buffer)}")
                
                # Save the audio data from the frame
                if self.save_output_files and hasattr(frame, 'to_ndarray'):
                    try:
                        audio_array = frame.to_ndarray()
                        audio_bytes = audio_array.tobytes()
                        self.output_buffer.extend(audio_bytes)
                    except Exception as e:
                        print(f"Error extracting audio from frame: {e}")
            else:
                # Create a silence frame
                print("Sending silence frame (no audio in buffer)")
                frame = AudioFrame(format="s16", layout="mono", samples=self.samples)
                for p in frame.planes:
                    p.update(bytes(p.buffer_size))

            frame.pts = pts
            frame.time_base = time_base
            frame.sample_rate = self.sample_rate
            
            # Periodically save output
            if self.save_output_files and len(self.output_buffer) > self.sample_rate * self.channels * 2:  # ~1 second
                self._save_output_buffer()
                
            return frame
            
        except Exception as e:
            traceback.print_exc()
            print("Error while creating frame:", e)
            # Return a silence frame on error
            frame = AudioFrame(format="s16", layout="mono", samples=self.samples)
            for p in frame.planes:
                p.update(bytes(p.buffer_size))
            return frame

    def _save_output_buffer(self):
        """Save accumulated audio to a file"""
        if len(self.output_buffer) == 0:
            return
            
        try:
            timestamp = datetime.now().strftime("%H%M%S_%f")[:-3]
            filename = f"output_{self.session_id}_{timestamp}.wav"
            filepath = os.path.join(self.output_save_dir, filename)
            
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(self.channels)
                wav_file.setsampwidth(self.sample_width)
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(self.output_buffer)
            
            print(f"Saved audio output to: {filepath} ({len(self.output_buffer)} bytes)")
            
            # Clear buffer after saving
            self.output_buffer.clear()
            
        except Exception as e:
            print(f"Error saving output buffer: {e}")

    async def cleanup(self):
        """Cleanup method"""
        print("Cleaning up audio track...")
        
        # Save any remaining audio
        if self.save_output_files and len(self.output_buffer) > 0:
            self._save_output_buffer()
        
        self.interrupt()
        self.stop()
        print("Audio track cleanup complete")