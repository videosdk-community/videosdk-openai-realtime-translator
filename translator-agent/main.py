"""
VideoSDK Real-Time Translator - Main Entry Point
Handles meeting setup, TTS, STT, and translation services.
"""

import asyncio
import os
import wave
from datetime import datetime

from google_stt import GoogleSTT
from google_translator import GoogleTranslator
from google_tts import GoogleTTS
from custom_audio_track import CustomAudioStreamTrack
from videosdk_handler.vs_meeting_handler import VSMeetingHandler


class AudioFileSaver:
    """Utility class for saving audio files for debugging purposes."""
    
    @staticmethod
    def save_wav(audio_bytes: bytes, sample_rate: int = 24000, 
                 channels: int = 1, filename: str = None) -> str:
        """
        Save raw audio bytes as a WAV file.
        
        Args:
            audio_bytes: Raw PCM audio data
            sample_rate: Audio sample rate in Hz (default: 24000)
            channels: Number of audio channels (default: 1 for mono)
            filename: Optional custom filename
            
        Returns:
            str: Path to the saved file
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"audio_{timestamp}.wav"
        
        # Ensure audio_debug directory exists
        os.makedirs("audio_debug", exist_ok=True)
        filepath = os.path.join("audio_debug", filename)
        
        try:
            with wave.open(filepath, 'wb') as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)  # 16-bit audio (2 bytes)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_bytes)
            
            print(f"✓ Audio saved: {filepath} ({len(audio_bytes)} bytes, "
                  f"{(len(audio_bytes) / (sample_rate * channels * 2)):.2f}s)")
            return filepath
        except Exception as e:
            print(f"✗ Failed to save audio: {e}")
            return None


async def main():
    """
    Main application entry point.
    Initializes all components and joins the VideoSDK meeting.
    """
    print("=" * 60)
    print("VIDEOSDK REAL-TIME TRANSLATOR")
    print("=" * 60)
    
    # Load environment variables
    VIDEOSDK_TOKEN = os.getenv("VIDEOSDK_TOKEN")
    MEETING_ID = os.getenv("MEETING_ID")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    
    # Validate configuration
    if not MEETING_ID:
        print("❌ ERROR: MEETING_ID environment variable not set")
        print("   Please set it: export MEETING_ID='your-meeting-id'")
        return
    
    if not VIDEOSDK_TOKEN:
        print("❌ ERROR: VIDEOSDK_TOKEN environment variable not set")
        print("   Please set it: export VIDEOSDK_TOKEN='your-token'")
        return
    
    if not GOOGLE_API_KEY:
        print("❌ ERROR: GOOGLE_API_KEY environment variable not set")
        print("   Please set it: export GOOGLE_API_KEY='your-google-api-key'")
        return
    
    print(f"Meeting ID: {MEETING_ID}")
    print(f"Token: {VIDEOSDK_TOKEN[:20]}...")
    print("-" * 60)
    
    try:
        # Create event loop (if not already running)
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Shared queue for inter-component communication
        queue = asyncio.Queue(maxsize=100)
        print("✓ Created shared message queue")
        
        # 1. Create custom audio track (for TTS output)
        print("\n1. Initializing Audio Components...")
        audio_track = CustomAudioStreamTrack(
            save_debug_audio=True,    # Enable saving audio for debugging
            debug_dir="audio_debug"   # Directory for debug files
        )
        print("   ✓ Custom audio track created")
        
        # 2. Initialize Google services
        print("\n2. Initializing Google Services...")
        
        # Speech-to-Text service
        stt = GoogleSTT(
            api_key=GOOGLE_API_KEY,
            language="en-US",  # Default language
            input_sample_rate=48000,
            output_sample_rate=48000,
            queue=queue
        )
        print("   ✓ Google Speech-to-Text initialized")
        
        # Text-to-Speech service
        tts = GoogleTTS(
            api_key=GOOGLE_API_KEY,
            audio_track=audio_track,
            loop=loop,
            queue=queue,
            save_audio_files=True,     # Save TTS audio files
            audio_save_dir="tts_audio_files"
        )
        print("   ✓ Google Text-to-Speech initialized")
        
        # Translation service
        translator = GoogleTranslator(
            api_key=GOOGLE_API_KEY,
            queue=queue
        )
        print("   ✓ Google Translator initialized")
        
        # 3. Create and initialize meeting handler
        print("\n3. Setting up VideoSDK Meeting...")
        room = VSMeetingHandler(
            meeting_id=MEETING_ID,
            auth_token=VIDEOSDK_TOKEN,
            name="AI Translator",      # Name shown in meeting
            loop=loop,
            audio_track=audio_track,
            stt=stt,
            tts=tts,
            translator=translator,
            queue=queue,
            vision=False               # Disable video processing
        )
        print("   ✓ Meeting handler created")
        
        # 4. Initialize and join the meeting
        print("\n4. Joining Meeting...")
        room.init_meeting()
        
        # Start the meeting join process
        join_task = asyncio.create_task(room.join())
        
        # Wait for join to complete with timeout
        try:
            await asyncio.wait_for(join_task, timeout=30.0)
            print("   ✓ Successfully joined the meeting!")
        except asyncio.TimeoutError:
            print("   ⚠️ Meeting join timed out after 30 seconds")
            return
        
        # 5. Main application loop
        print("\n5. Application Running...")
        print("   [Ctrl+C] to exit")
        print("-" * 60)
        
        # Display status
        print("\nStatus: Waiting for participants...")
        print("TTS audio will be saved to: tts_audio_files/")
        print("Debug audio will be saved to: audio_debug/")
        
        # Keep the application running
        try:
            while True:
                # Check for messages in queue (non-blocking)
                try:
                    message = queue.get_nowait()
                    if message:
                        print(f"Queue message: {message.get('topic', 'unknown')}")
                except asyncio.QueueEmpty:
                    pass
                
                # Small sleep to prevent busy-waiting
                await asyncio.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Shutdown requested...")
        
        # 6. Cleanup
        print("\n6. Cleaning up...")
        await room.cleanup()
        await audio_track.cleanup()
        
        # Cleanup Google services
        if hasattr(stt, 'aclose'):
            await stt.aclose()
        if hasattr(translator, 'aclose'):
            await translator.aclose()
        if hasattr(tts, 'aclose'):
            await tts.aclose()
        
        print("✓ Cleanup complete")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\nTroubleshooting tips:")
        print("1. Check your internet connection")
        print("2. Verify VIDEOSDK_TOKEN is valid")
        print("3. Ensure MEETING_ID is correct")
        print("4. Check Google API key permissions")
        print("=" * 60)


if __name__ == "__main__":
    """
    Application entry point when run directly.
    """
    print("\n🚀 Starting VideoSDK Real-Time Translator...")
    
    # Run the main async function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Application terminated by user")
    except Exception as e:
        print(f"\n💥 Unhandled exception: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n✨ Application shutdown complete")