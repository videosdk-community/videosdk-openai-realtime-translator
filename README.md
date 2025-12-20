# VideoSDK Real-Time Translation System

A real-time video conferencing translation system powered by VideoSDK, Google Cloud Speech-to-Text, Translation, and Text-to-Speech APIs. This project enables live language translation during one-to-one video meetings with automatic voice synthesis.

## 🎯 Overview

This project consists of two main components:

1. **Frontend Meeting Interface** (`videosdk-translator-meeting/`) - React-based video conferencing UI
2. **Translation Agent** (`translator-agent/`) - Python backend that handles STT, translation, and TTS

The system works by:
- Capturing audio from meeting participants
- Converting speech to text (STT)
- Translating text to the target language
- Converting translated text back to speech (TTS)
- Playing translated audio to participants

> [!IMPORTANT]
> **This system is designed for ONE-TO-ONE meetings only.** Having more than 2 participants may cause unexpected behavior.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) and npm
- **Python 3.8+** and pip
- **Git**
- **Google Cloud Account** with the following APIs enabled:
  - Cloud Speech-to-Text API
  - Cloud Translation API
  - Cloud Text-to-Speech API
- **VideoSDK Account** ([Sign up here](https://www.videosdk.live/))

---

## 🚀 Quick Start

### Part 1: Frontend Setup (Meeting Interface)

#### Step 1: Navigate to the Frontend Directory

```bash
cd videosdk-translator-meeting
```

#### Step 2: Configure Environment Variables

Create a `.env` file by copying the example template:

```bash
cp .env.example .env
```

Then edit the `.env` file and add your VideoSDK credentials:

```env
REACT_APP_VIDEOSDK_TOKEN=your_videosdk_token_here
```

**How to get your VideoSDK token:**
1. Go to [VideoSDK Dashboard](https://app.videosdk.live/)
2. Navigate to API Keys section
3. Copy your API Key or generate a token

#### Step 3: Install Dependencies

```bash
npm install
```

This will install all required React dependencies (~1,200 packages). The process may take 1-2 minutes.

#### Step 4: Start the Development Server

```bash
npm start
```

The React app will start on `http://localhost:3000` (or another port if 3000 is busy).

#### Step 5: Join the Meeting

1. **Open the app** in your browser at `http://localhost:3000`
2. **Create a new meeting** or enter an existing meeting ID
3. **Important**: Have the second participant join using the **same meeting ID**
4. **Critical**: Ensure **only 2 people** are in the meeting (this example supports one-to-one meetings only)

> [!WARNING]
> Do not add more than 2 participants to the meeting. The translation agent is configured for one-to-one conversations.

---

### Part 2: Backend Setup (Translation Agent)

#### Step 6: Open a New Terminal

Keep the frontend server running and open a new terminal window/tab.

#### Step 7: Navigate to the Translation Agent Directory

```bash
cd translator-agent
```

#### Step 8: Configure API Keys

Create a `.env` file by copying the example:

```bash
cp .env.example .env
```

Edit the `.env` file and add all required credentials:

```env
# VideoSDK Configuration
VIDEOSDK_TOKEN=your_videosdk_token_here
MEETING_ID=your_meeting_id_here

# Google Cloud API Key
GOOGLE_API_KEY=your_google_cloud_api_key_here
```

**How to get your Google Cloud API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **API Key**
4. Enable the following APIs:
   - Cloud Speech-to-Text API
   - Cloud Translation API
   - Cloud Text-to-Speech API
5. Copy the API key to your `.env` file

**Meeting ID:** Use the same meeting ID that you created in the frontend (Step 5).

#### Step 9: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or if you're using Python 3 specifically:

```bash
pip3 install -r requirements.txt
```

**Installed packages include:**
- `videosdk` - VideoSDK Python SDK
- `httpx` - HTTP client for API calls
- `numpy` - Numerical computing
- `python-dotenv` - Environment variable management
- `pydantic` - Data validation
- `scipy` - Scientific computing
- `onnxruntime` - Voice activity detection

#### Step 10: Start the Translation Agent

```bash
python3 main.py
```

**Expected output:**
```
==========================================================
VIDEOSDK REAL-TIME TRANSLATOR
==========================================================
Meeting ID: your-meeting-id
Token: eyJhbGciOiJIUzI1...
----------------------------------------------------------
1. Initializing Audio Components...
   ✓ Custom audio track created
2. Initializing Google Services...
   ✓ Google Speech-to-Text initialized
   ✓ Google Text-to-Speech initialized
   ✓ Google Translator initialized
3. Setting up VideoSDK Meeting...
   ✓ Meeting handler created
4. Joining Meeting...
   ✓ Successfully joined the meeting!
5. Application Running...
   [Ctrl+C] to exit
----------------------------------------------------------
```

---

## 🎙️ Using the Translation System

Once both components are running:

1. **Both participants should be in the video meeting**
2. **The translation agent will automatically join** as a third participant (AI Translator)
3. **Start speaking** - The system will:
   - Detect your voice
   - Convert speech to text
   - Translate to the target language
   - Synthesize translated speech
   - Play audio to the other participant
4. **Audio files are saved** for debugging in:
   - `tts_audio_files/` - Generated TTS audio
   - `audio_debug/` - Debug audio streams

---

## 🛠️ Configuration Options

### Frontend Configuration

Edit `videosdk-translator-meeting/.env`:

```env
# VideoSDK Token
REACT_APP_VIDEOSDK_TOKEN=your_token

# Optional: Custom meeting configuration
REACT_APP_MEETING_ID=fixed-meeting-id
```

### Backend Configuration

Edit `translator-agent/.env`:

```env
# Required
VIDEOSDK_TOKEN=your_videosdk_token
MEETING_ID=your_meeting_id
GOOGLE_API_KEY=your_google_api_key

# Optional: Language settings (modify in main.py)
# Default: English (en-US) to other languages
```

To change default languages, edit `translator-agent/main.py`:

```python
stt = GoogleSTT(
    api_key=GOOGLE_API_KEY,
    language="en-US",  # Change source language here
    # ...
)
```

---

## 📁 Project Structure

```
push-to-talk-translator-using-google/
├── videosdk-translator-meeting/     # Frontend React app
│   ├── src/                          # React source code
│   ├── public/                       # Static assets
│   ├── .env                          # Environment variables (create this)
│   ├── .env.example                  # Environment template
│   ├── package.json                  # Node dependencies
│   └── README.md                     # Frontend-specific docs
│
├── translator-agent/                 # Backend Python agent
│   ├── __pycache__/                  # Python cache
│   ├── videosdk_handler/             # VideoSDK integration
│   ├── custom_audio_track.py         # Audio track handling
│   ├── google_stt.py                 # Speech-to-Text service
│   ├── google_translator.py          # Translation service
│   ├── google_tts.py                 # Text-to-Speech service
│   ├── silero_vad.py                 # Voice activity detection
│   ├── main.py                       # Main entry point
│   ├── .env                          # Environment variables (create this)
│   ├── .env.example                  # Environment template
│   └── requirements.txt              # Python dependencies
│
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

---

## 🔧 Troubleshooting

### Frontend Issues

**Problem: `npm install` fails with dependency conflicts**

Solution: Make sure you're using React 18, not React 19:
```bash
# Check package.json - should be:
"react": "^18.2.0",
"react-dom": "^18.2.0"
```

**Problem: Port 3000 already in use**

Solution: The app will automatically use another port, or you can specify one:
```bash
PORT=3001 npm start
```

**Problem: Cannot connect to meeting**

Solution:
- Verify your `REACT_APP_VIDEOSDK_TOKEN` is correct
- Check that the token hasn't expired
- Ensure you have internet connectivity

### Backend Issues

**Problem: `ModuleNotFoundError` when running `main.py`**

Solution: Install dependencies from the correct directory:
```bash
cd translator-agent
pip3 install -r requirements.txt
python3 main.py
```

**Problem: Google API authentication errors**

Solution:
- Verify your `GOOGLE_API_KEY` is correct
- Ensure the following APIs are enabled in Google Cloud Console:
  - Cloud Speech-to-Text API
  - Cloud Translation API
  - Cloud Text-to-Speech API
- Check that your API key has the necessary permissions

**Problem: "MEETING_ID environment variable not set"**

Solution: Make sure you created the `.env` file in `translator-agent/`:
```bash
cd translator-agent
cp .env.example .env
# Edit .env and add your credentials
```

**Problem: Translation agent joins but doesn't translate**

Solution:
- Verify both participants are speaking clearly
- Check that audio permissions are granted in the browser
- Look for errors in the agent terminal output
- Ensure debug audio is being saved to `audio_debug/` folder

---

## 🙏 Acknowledgments

- [VideoSDK](https://www.videosdk.live/) - Video conferencing infrastructure
- [Google Cloud AI](https://cloud.google.com/ai) - Speech, translation, and synthesis services
- [React](https://reactjs.org/) - Frontend framework

---

## 🎉 Happy Translating!

Now you're ready to conduct real-time translated video meetings! Enjoy seamless communication across language barriers.
