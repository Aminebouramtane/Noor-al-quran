# Noor Al-Quran Backend

FastAPI-based API server for Tajweed learning platform with audio dataset management.

## Structure

```
backend/
├── main.py              # FastAPI application
├── config.py            # Configuration management
├── .env.local           # Environment variables
├── Dockerfile           # Docker configuration
├── requirements.txt     # Python dependencies
├── data/
│   └── metadataset.csv  # Audio metadata (2,264 samples)
└── uploads/             # User-uploaded recordings
```

## API Endpoints

### Lessons & Audio
- `GET /api/lessons` - List all Tajweed lessons
- `GET /api/lessons/{label_name}/audio` - Get audio for specific lesson
- `GET /api/audio/{audio_id}` - Stream audio file
- `GET /api/sheikhs` - List Quranic scholars

### Metadata & Stats
- `GET /api/metadata` - Dataset statistics
- `GET /api/stats` - Samples breakdown by label/sheikh

### User Audio
- `POST /api/upload-audio` - Upload user recording for analysis

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment** (`.env.local`):
   ```
   DATASET_PATH=./data/metadataset.csv
   AUDIO_BASE_PATH=/content/dataset
   GOOGLE_DRIVE_PATH=/content/drive/MyDrive/DATASET
   ```

3. **Run locally:**
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access API:**
   - OpenAPI Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Docker

```bash
docker build -t noor-al-quran-backend .
docker run -p 8000:8000 -v /path/to/dataset:/app/data noor-al-quran-backend
```

## Dataset Info

**Metadata File:** `data/metadataset.csv`
- 2,264 audio samples
- Tajweed rules: Ikhfa, Idgham, Qalqala, etc.
- Multiple Quranic scholars
- Audio formats: MP3, M4A, WAV

**Columns:**
- `global_id` - Unique identifier
- `label_id` / `label_name` - Tajweed rule category
- `sheikh_id` / `sheikh_name` - Scholar
- `audio_num` - Sample number
- `original_file` - Original filename
- `new_file` - Standardized filename
- `original_path` - Google Drive path
- `new_path` - Local dataset path
