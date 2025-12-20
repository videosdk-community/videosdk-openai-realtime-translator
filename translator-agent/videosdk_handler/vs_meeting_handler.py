import time
from typing import Any

from silero_vad import SileroVAD, VADEventType, VADResponse
from videosdk import (
    PubSubPublishConfig,
    PubSubSubscribeConfig,
)
from videosdk import MeetingConfig, VideoSDK, Participant, Stream

from google_stt import GoogleSTT
from google_translator import GoogleTranslator
from google_tts import GoogleTTS
from .meeting_event_handler import MeetingHandler
from .participant_event_handler import ParticipantHandler
from .audio_stream import CustomAudioStreamTrack
from dotenv import load_dotenv
import numpy as np
import asyncio
import os
from asyncio import AbstractEventLoop

load_dotenv()


class VSMeetingHandler:
    def __init__(
        self,
        *,
        meeting_id: str,
        auth_token: str | None = None,
        name: str,
        stt: GoogleSTT,
        translator: GoogleTranslator,
        tts: GoogleTTS,
        loop: AbstractEventLoop,
        audio_track: CustomAudioStreamTrack,
        vision: bool = False,
        queue: asyncio.Queue,
    ):
        self.loop = loop
        self.audio_track = audio_track

        print(meeting_id, auth_token)
        # UNCOMMENT THIS FOR TTS AUDIO:
        self.meeting_config = MeetingConfig(
            name=name,
            meeting_id=meeting_id,
            token=auth_token,
            mic_enabled=True,
            webcam_enabled=False,
            custom_microphone_audio_track=self.audio_track,  # ENABLED FOR TTS
            meta_data={"translator": True},
            mode="SEND_AND_RECV",
        )
        self.audio_listener_tasks = {}
        self.video_listener_tasks = {}
        self.vision = vision
        self.meeting = None
        self.stt = stt
        self.translator = translator
        self.tts = tts

        self.participants_data = {}
        self._audio_buffer: dict[str, bytearray] = {}
        
        # Store language preferences: {participant_id: language_code}
        self.participant_languages = {}

        self.publish_queue = queue
        self.vad_enabled = False
        self.vad = SileroVAD(vad_callback=self.vad_callback)
        print("Language details initialized")

    def init_meeting(self):
        self.meeting = VideoSDK.init_meeting(**self.meeting_config)
        self.meeting.add_event_listener(
            MeetingHandler(
                on_meeting_joined=self.on_meeting_joined,
                on_meeting_left=self.on_meeting_left,
                on_participant_joined=self.on_participant_joined,
                on_participant_left=self.on_participant_left,
            )
        )

    async def join(self):
        await self.meeting.async_join()

    def pubsub_call_back(self, message):
        if "payload" in message:
            payload = message["payload"]
            self.vad_enabled = payload["enable"]
            print("VAD-enabled changed to:", self.vad_enabled)

    async def vad_callback(self, vad_response: VADResponse) -> None:
        if vad_response.event_type == VADEventType.START_OF_SPEECH:
            print("Speech started:", vad_response.data.participant.display_name)
            await self.publish_queue.put(
                {"topic": "VAD_EVENT", "payload": {"state": "SPEECH_STARTED"}}
            )
        elif vad_response.event_type == VADEventType.END_OF_SPEECH:
            print("Speech stopped:", vad_response.data.participant.display_name)
            await self.publish_queue.put(
                {"topic": "VAD_EVENT", "payload": {"state": "SPEECH_STOPPED"}}  # Fixed typo
            )
            participant = vad_response.data.participant
            await self.process_translation(participant=participant)
            self._audio_buffer[participant.id] = bytearray()

    def leave(self):
        for audio_task in self.audio_listener_tasks.values():
            audio_task.cancel()
        for video_task in self.video_listener_tasks.values():
            video_task.cancel()
        if self.meeting:
            self.meeting.leave()

    def on_meeting_joined(self, data):
        print("Agent joined the meeting")
        pubsub_config = PubSubSubscribeConfig(
            topic="VAD_ENABLE", cb=self.pubsub_call_back
        )
        print("Topic VAD_ENABLE subscribed..")

        # Start the publish worker after joining
        self.loop.create_task(self.start_publish_worker())
        
        # Subscribe to VAD topic
        asyncio.create_task(self.meeting.pubsub.subscribe(pubsub_config))

    def on_meeting_left(self, data):
        print("Meeting Left:", data)

    def on_participant_joined(self, participant: Participant):
        peer_name = participant.display_name
        self.participants_data[participant.id] = {
            "name": peer_name,
            "participant": participant
        }
        
        # Extract language information from participant metadata
        # Default to 'en-IN' if not specified
        participant_language = "en-IN"
        if hasattr(participant, 'meta_data') and participant.meta_data:
            participant_language = participant.meta_data.get('language', 'en-IN')
        
        self.participant_languages[participant.id] = participant_language
        
        print(f"Participant joined: {peer_name} ({participant.id})")
        print(f"  - Language: {participant_language}")
        print(f"  - Current Participants: {len(self.participants_data)}")

        def on_stream_enabled(stream: Stream):
            if stream.kind == "audio":
                self.audio_listener_tasks[stream.id] = self.loop.create_task(
                    self.add_audio_listener(participant, stream)
                )
            if stream.kind == "video":
                self.video_listener_tasks[stream.id] = self.loop.create_task(
                    self.add_video_listener(stream)
                )

        def on_stream_disabled(stream: Stream):
            if stream.kind == "audio":
                audio_task = self.audio_listener_tasks.get(stream.id)
                if audio_task is not None:
                    if not self.vad_enabled:
                        self.loop.create_task(
                            self.process_translation(participant=participant)
                        )
                    else:
                        self._audio_buffer[participant.id] = bytearray()
                    audio_task.cancel()
                    del self.audio_listener_tasks[stream.id]

            if stream.kind == "video":
                video_task = self.video_listener_tasks.get(stream.id)
                if video_task is not None:
                    video_task.cancel()
                    del self.video_listener_tasks[stream.id]

        participant.add_event_listener(
            ParticipantHandler(
                participant_id="AI_AGENT",
                on_stream_enabled=on_stream_enabled,
                on_stream_disabled=on_stream_disabled,
            )
        )

    def on_participant_left(self, participant: Participant):
        print("Participant left:", participant.display_name)
        # Clean up tasks for this participant
        for stream_id in list(self.audio_listener_tasks.keys()):
            task = self.audio_listener_tasks[stream_id]
            task.cancel()
            del self.audio_listener_tasks[stream_id]
        
        for stream_id in list(self.video_listener_tasks.keys()):
            task = self.video_listener_tasks[stream_id]
            task.cancel()
            del self.video_listener_tasks[stream_id]
        
        # Clean up buffers
        if participant.id in self._audio_buffer:
            del self._audio_buffer[participant.id]
        if participant.id in self.participant_languages:
            del self.participant_languages[participant.id]
        if participant.id in self.participants_data:
            del self.participants_data[participant.id]

    async def process_translation(self, participant: Participant):
        print(f"{'#'*50}")
        print("Handling audio buffer for participant:", participant.display_name)
        total_start_time = time.time()
        
        if participant.id not in self.participant_languages:
            print(f"No language details found for participant {participant.id}")
            print(f"{'#'*50}")
            return
            
        source_language = self.participant_languages[participant.id]
        
        # Check if we have audio data
        if participant.id not in self._audio_buffer or len(self._audio_buffer[participant.id]) == 0:
            print("No audio data to process")
            await self.publish_queue.put(
                {
                    "topic": "STATE_CHANGE",
                    "payload": {"state": "IDLE", "timestamps": time.time()},
                }
            )
            print(f"{'#'*50}")
            return
        
        await self.publish_queue.put(
            {
                "topic": "STATE_CHANGE",
                "payload": {"state": "TRANSCRIBING", "timestamps": time.time()},
            }
        )
        
        # STT Timing
        print(f"\n{'='*50}")
        print(f"STT (Speech-to-Text) - Starting... (Lang: {source_language})")
        stt_start = time.time()
        
        text = await self.stt._transcribe_buffer(
            self._audio_buffer[participant.id],
            source_language_code=source_language,
        )
        
        stt_time = time.time() - stt_start
        print(f"STT Result: {text}")
        print(f"STT Time Taken: {stt_time:.3f} seconds")
        print(f"{'='*50}\n")
        
        # Clear the buffer after processing
        if participant.id in self._audio_buffer:
            self._audio_buffer[participant.id] = bytearray()
        
        if not text or text.strip() == "":
            print("No text to translate")
            await self.publish_queue.put(
                {
                    "topic": "STATE_CHANGE",
                    "payload": {"state": "IDLE", "timestamps": time.time()},
                }
            )
            print(f"{'#'*50}")
            return
        
        # Publish Transcript to EVERYONE (Original Text)
        await self.publish_queue.put(
            {
                "topic": "TRANSCRIPT",
                "payload": {
                    "peerId": participant.id,
                    "peerName": participant.display_name,
                    "text": text,
                    "language": source_language,
                    "timestamps": time.time(),
                },
            }
        )

        await self.publish_queue.put(
            {
                "topic": "STATE_CHANGE",
                "payload": {"state": "TRANSLATING", "timestamps": time.time()},
            }
        )
        
        # PROCESS TRANSLATION FOR EACH PARTICIPANT
        # We need to translate and speak for each target language
        # To avoid chaos, we will do this briefly sequentially or we can group by language.
        # For simplicity in V1: Group by language
        
        targets_by_lang = {}
        for pid, lang in self.participant_languages.items():
            if pid == participant.id:
                continue # Don't translate back to speaker
            if pid == "AI_AGENT": 
                continue
                
            if lang not in targets_by_lang:
                targets_by_lang[lang] = []
            targets_by_lang[lang].append(pid)
            
        print(f"Translation Targets: {targets_by_lang}")
        
        for target_lang, target_pids in targets_by_lang.items():
            print(f"{'='*50}")
            print(f"TRANSLATOR ({source_language} -> {target_lang}) - Starting...")
            translator_start = time.time()
            
            translated_text = await self.translator.translate(
                text=text,
                source_language_code=source_language,
                target_language_code=target_lang,
            )
            
            translator_time = time.time() - translator_start
            print(f"Translation Result: {translated_text}")
            print(f"Translator Time ({target_lang}): {translator_time:.3f} seconds")
            
            if not translated_text:
                continue

            # Notify UI of translation
            # We send this to everyone so they can see subtitles, 
            # but we might want to flag who it is for.
            await self.publish_queue.put(
                {
                    "topic": "TRANSCRIPT",
                    "payload": {
                        "peerId": self.meeting.local_participant.id,
                        "text": translated_text,
                        "peerName": self.meeting.local_participant.display_name,
                        "language": target_lang,
                        "original_sender": participant.id,
                        "target_users": target_pids,
                        "timestamps": time.time(),
                    },
                }
            )

            # AUDIO ROUTING & TTS
            # 1. Announce who this audio is for
            print(f"  > Routing Audio to: {target_pids}")
            await self.publish_queue.put(
                {
                    "topic": "AUDIO_ROUTING",
                    "payload": {
                        "target_users": target_pids,
                        "timestamp": time.time()
                    }
                }
            )
            
            # Small buffer for client to process event
            await asyncio.sleep(0.2) 

            # 2. Synthesize & Play
            print(f"  > TTS ({target_lang}) - Starting...")
            await self.publish_queue.put(
                {
                    "topic": "STATE_CHANGE",
                    "payload": {"state": "SPEAKING", "timestamps": time.time()},
                }
            )
            
            try:
                await self.tts.synthesize(
                    text=translated_text,
                    target_language_code=target_lang,
                )
            except Exception as e:
                print(f"  > TTS Failed: {e}")
            
            # 3. Clear Routing REMOVED
            # We will rely on the client-side timeout (15s) or the next turn's routing event.
            # Sending an explicit clear here cuts off the audio because the client
            # still has audio in its jitter buffer when this message arrives.
            pass
            
            print(f"{'='*50}\n")

        total_time = time.time() - total_start_time
        print(f"Total Turn Time: {total_time:.3f}s")

        await self.publish_queue.put(
            {
                "topic": "STATE_CHANGE",
                "payload": {"state": "IDLE", "timestamps": time.time()},
            }
        )
        print(f"{'#'*50}\n")

    async def start_publish_worker(self):
        """Worker to publish messages to PubSub."""
        print("Starting publish worker...")
        while True:
            try:
                data = await self.publish_queue.get()
                if self.meeting and hasattr(self.meeting, 'pubsub'):
                    await self.meeting.pubsub.publish(
                        pubsub_config=PubSubPublishConfig(
                            topic=data["topic"],
                            message="AI_AGENT",
                            payload=data["payload"],
                            options={"persist": True},
                        )
                    )
                    print(f"Published to topic: {data['topic']}")
                else:
                    print("Meeting or PubSub not available yet, waiting...")
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                print("Publish worker cancelled")
                break
            except Exception as e:
                print(f"Error in publish worker: {e}")
                await asyncio.sleep(1)

    async def add_audio_listener(self, participant: Participant, stream: Stream):
        print(f"Starting audio listener for {participant.display_name}")
        await self.publish_queue.put(
            {
                "topic": "STATE_CHANGE",
                "payload": {"state": "LISTENING", "timestamps": time.time()},
            }
        )
        peer_id = participant.id
        self._audio_buffer[peer_id] = bytearray()
        
        while True:
            try:
                await asyncio.sleep(0.01)
                frame = await stream.track.recv()
                audio_data = frame.to_ndarray()[0]
                pcm_frame = audio_data.flatten().astype(np.int16).tobytes()
                self._audio_buffer[peer_id].extend(pcm_frame)

                if self.vad_enabled:
                    await self.vad.process_audio(
                        audio_frames=pcm_frame, participant=participant
                    )

            except asyncio.CancelledError:
                print(f"Audio listener for {participant.display_name} cancelled")
                break
            except Exception as e:
                print(f"Audio processing error for {participant.display_name}: {e}")
                break

    async def add_video_listener(self, stream: Stream):
        print(f"Starting video listener for stream {stream.id}")
        while True:
            try:
                await asyncio.sleep(0.01)
                frame = await stream.track.recv()
                # Process video frame if needed
            except asyncio.CancelledError:
                print(f"Video listener for stream {stream.id} cancelled")
                break
            except Exception as e:
                print(f"Video processing error: {e}")
                break

    async def cleanup(self):
        """Cleanup method"""
        print("Cleaning up VSMeetingHandler...")
        
        # Cancel all tasks
        for task in list(self.audio_listener_tasks.values()):
            task.cancel()
        for task in list(self.video_listener_tasks.values()):
            task.cancel()
        
        # Clear buffers
        self._audio_buffer.clear()
        self.participant_languages.clear()
        self.participants_data.clear()
        
        # Clean up audio track
        if hasattr(self, "audio_track") and self.audio_track:
            await self.audio_track.cleanup()
        
        print("VSMeetingHandler cleanup complete")