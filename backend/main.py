from fastapi import FastAPI, HTTPException, File, UploadFile, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import os
from typing import Optional, List
from dotenv import load_dotenv
from datetime import datetime
import logging
import subprocess
from pathlib import Path
from mimetypes import guess_type
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud import storage as gcs_storage

load_dotenv()

app = FastAPI(
    title="Noor Al-Quran API",
    description="Tajweed Learning Platform with AI-powered Feedback",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GDRIVE_FOLDER_URL = os.getenv(
    "GDRIVE_FOLDER_URL",
    "https://drive.google.com/drive/folders/1u9LrPCUpTtwiPbPas2sah4s_BseoU2Um?usp=sharing",
)
GDRIVE_MIRROR_DIR = os.getenv("GDRIVE_MIRROR_DIR", "/tmp/gdrive_mirror")
AUTO_SYNC_ON_STARTUP = os.getenv("AUTO_SYNC_ON_STARTUP", "false").lower() == "true"
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "")
LOCAL_DATASET_DIR = os.getenv("LOCAL_DATASET_DIR", "./data/dataset")
LOCAL_DATASET_METADATA_PATH = os.getenv("DATASET_PATH", "./data/dataset/metadata.csv")
QURAN_DATASET_PATH = os.getenv("QURAN_DATASET_PATH", "./data/The Quran Dataset.csv")

firebase_enabled = False
db = None
bucket = None
gcs_client = None
df_quran = None

# Arabic to English lesson name mapping
LESSON_NAME_MAPPING = {
    "أحكام النون الساكنة": "Ikhfa",
    "أحكام الميم الساكنة": "Idgham",
    "المدود": "Izhar",
    "أحكام الإقلاب": "Iqlab",
    # English names (fallback)
    "ikhfa": "Ikhfa",
    "idgham": "Idgham",
    "izhar": "Izhar",
    "iqlab": "Iqlab",
}

def get_english_lesson_name(lesson_name: str) -> Optional[str]:
    """Convert Arabic lesson name to English (dataset name)"""
    normalized = lesson_name.strip()
    if normalized in LESSON_NAME_MAPPING:
        return LESSON_NAME_MAPPING[normalized]
    # Try case-insensitive match for English names
    for key, value in LESSON_NAME_MAPPING.items():
        if key.lower() == normalized.lower():
            return value
    return None

def extract_dataset_relative_path(gdrive_path: str) -> Optional[str]:
    if not isinstance(gdrive_path, str):
        return None
    marker = "DATASET/"
    if marker not in gdrive_path:
        return None
    relative = gdrive_path.split(marker, 1)[1].strip("/")
    return relative or None


def find_local_dataset_audio_file(new_file: Optional[str] = None, global_id: Optional[str] = None) -> Optional[str]:
    dataset_root = Path(LOCAL_DATASET_DIR)
    if not dataset_root.exists():
        return None

    candidates = []
    if new_file:
        candidates.append(dataset_root / str(new_file))
    if global_id:
        gid = str(global_id).lstrip("0")
        if gid:
            candidates.extend(dataset_root.glob(f"*{gid}.wav"))

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return str(candidate)

    return None


def find_mirrored_audio_file(original_path: str, new_file: Optional[str] = None) -> Optional[str]:
    relative = extract_dataset_relative_path(original_path)
    mirror_root = Path(GDRIVE_MIRROR_DIR)
    if not mirror_root.exists():
        return None

    # 1) Exact relative path match under mirror root
    if relative:
        exact = mirror_root / relative
        if exact.exists() and exact.is_file():
            return str(exact)

    # 2) Fallback by converted dataset filename (most reliable in this project)
    if new_file:
        new_name = Path(str(new_file)).name
        if new_name:
            matches = list(mirror_root.rglob(new_name))
            if matches:
                return str(matches[0])

    # 3) Fallback by original basename search
    basename = Path(original_path).name
    if basename:
        matches = list(mirror_root.rglob(basename))
        if matches:
            return str(matches[0])

    return None


def is_audio_available(record) -> bool:
    local_path = find_local_dataset_audio_file(str(record.get('new_file', '')), str(record.get('global_id', '')))
    if local_path:
        return True
    mirrored = find_mirrored_audio_file(str(record.get('original_path', '')), str(record.get('new_file', '')))
    return bool(mirrored and os.path.exists(mirrored))


def json_safe(value):
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if hasattr(value, 'item'):
        try:
            value = value.item()
        except Exception:
            pass
    return value


def sync_google_drive_folder() -> dict:
    os.makedirs(GDRIVE_MIRROR_DIR, exist_ok=True)
    cmd = [
        "gdown",
        "--folder",
        GDRIVE_FOLDER_URL,
        "-O",
        GDRIVE_MIRROR_DIR,
        "--remaining-ok",
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True)
    return {
        "returncode": completed.returncode,
        "stdout": completed.stdout[-2000:],
        "stderr": completed.stderr[-2000:],
        "mirror_dir": GDRIVE_MIRROR_DIR,
    }


def initialize_firebase() -> bool:
    global firebase_enabled, db, bucket, gcs_client
    try:
        if firebase_admin._apps:
            firebase_enabled = True
            db = firestore.client()
            bucket = storage.bucket()
            gcs_client = gcs_storage.Client.from_service_account_json(FIREBASE_SERVICE_ACCOUNT_PATH)
            return True

        if not FIREBASE_STORAGE_BUCKET:
            logger.warning("⚠ Firebase disabled: FIREBASE_STORAGE_BUCKET is empty")
            return False

        if not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
            logger.warning(f"⚠ Firebase disabled: service account file not found at {FIREBASE_SERVICE_ACCOUNT_PATH}")
            return False

        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})
        db = firestore.client()
        bucket = storage.bucket()
        gcs_client = gcs_storage.Client.from_service_account_json(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_enabled = True
        logger.info("✓ Firebase Admin initialized")
        return True
    except Exception as e:
        logger.warning(f"⚠ Firebase init failed: {e}")
        firebase_enabled = False
        return False


def ensure_firebase_bucket_exists() -> None:
    if gcs_client is None:
        raise RuntimeError("Google Cloud Storage client is not initialized")
    if not FIREBASE_STORAGE_BUCKET:
        raise RuntimeError("FIREBASE_STORAGE_BUCKET is empty")

    existing_bucket = gcs_client.lookup_bucket(FIREBASE_STORAGE_BUCKET)
    if existing_bucket is None:
        logger.info(f"Creating missing Firebase Storage bucket: {FIREBASE_STORAGE_BUCKET}")
        gcs_client.create_bucket(FIREBASE_STORAGE_BUCKET)


def resolve_audio_file_path(record) -> Optional[str]:
    local_path = find_local_dataset_audio_file(
        str(record.get('new_file', '')),
        str(record.get('global_id', '')),
    )
    if local_path and os.path.exists(local_path):
        return local_path

    mirrored = find_mirrored_audio_file(
        str(record.get('original_path', '')),
        str(record.get('new_file', '')),
    )
    if mirrored and os.path.exists(mirrored):
        return mirrored
    return None


def upload_sample_to_firebase(record, file_path: str) -> dict:
    if not firebase_enabled or db is None or bucket is None:
        raise RuntimeError("Firebase is not initialized")

    ensure_firebase_bucket_exists()

    global_id = str(record.get('global_id'))
    label_name = str(record.get('label_name'))
    sheikh_name = str(record.get('sheikh_name'))
    new_file = str(record.get('new_file'))
    audio_num = int(record.get('audio_num')) if str(record.get('audio_num')).isdigit() else record.get('audio_num')

    ext = Path(file_path).suffix or ".wav"
    storage_path = f"tajweed/{label_name}/{sheikh_name}/{global_id}{ext}"
    blob = bucket.blob(storage_path)

    if not blob.exists():
        blob.upload_from_filename(file_path, content_type=guess_type(file_path)[0] or "audio/wav")

    # Signed URL for client playback
    signed_url = blob.generate_signed_url(expiration=datetime(2100, 1, 1), method="GET")

    data = {
        "global_id": global_id,
        "label_name": label_name,
        "sheikh_name": sheikh_name,
        "audio_num": audio_num,
        "new_file": new_file,
        "storage_path": storage_path,
        "download_url": signed_url,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection("lesson_samples").document(global_id).set(data)
    return data


def get_firebase_samples(label_name: str, sheikh_name: Optional[str] = None) -> List[dict]:
    if not firebase_enabled or db is None:
        return []

    docs = db.collection("lesson_samples").stream()
    out = []
    for doc in docs:
        item = doc.to_dict() or {}
        if str(item.get("label_name", "")).lower() != label_name.lower():
            continue
        if sheikh_name and str(item.get("sheikh_name", "")).lower() != sheikh_name.lower():
            continue
        out.append({
            "global_id": item.get("global_id"),
            "sheikh_name": item.get("sheikh_name"),
            "new_file": item.get("new_file"),
            "audio_num": item.get("audio_num"),
            "firebase_url": item.get("download_url"),
        })

    out.sort(key=lambda x: (str(x.get("sheikh_name", "")), str(x.get("audio_num", ""))))
    return out

# Models
class LessonResponse(BaseModel):
    global_id: str
    label_id: str
    label_name: str
    sheikh_id: str
    sheikh_name: str
    audio_file: str
    
class AudioMetadata(BaseModel):
    total_duration: float
    format: str
    sample_rate: int
    channels: int

# Load dataset
@app.on_event("startup")
async def load_dataset():
    global df_dataset, df_quran
    dataset_path_candidates = [LOCAL_DATASET_METADATA_PATH, "./data/metadataset.csv"]
    dataset_path = next((path for path in dataset_path_candidates if os.path.exists(path)), None)
    if dataset_path:
        df_dataset = pd.read_csv(dataset_path)
        logger.info(f"✓ Dataset loaded: {len(df_dataset)} audio samples")
        if AUTO_SYNC_ON_STARTUP:
            logger.info("↻ AUTO_SYNC_ON_STARTUP=true, syncing Google Drive mirror...")
            sync_result = sync_google_drive_folder()
            if sync_result["returncode"] == 0:
                logger.info(f"✓ Google Drive mirror synced to {sync_result['mirror_dir']}")
            else:
                logger.warning("⚠ Google Drive sync failed at startup")
    else:
        logger.warning(f"⚠ Dataset not found at any known path: {dataset_path_candidates}")
        df_dataset = None

    if os.path.exists(QURAN_DATASET_PATH):
        df_quran = pd.read_csv(QURAN_DATASET_PATH)
        logger.info(f"✓ Quran dataset loaded: {len(df_quran)} ayahs")
    else:
        logger.warning(f"⚠ Quran dataset not found at {QURAN_DATASET_PATH}")
        df_quran = None

    initialize_firebase()

# Routes
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Noor Al-Quran Backend API",
        "version": "1.0.0",
        "endpoints": {
            "lessons": "/api/lessons",
            "audio": "/api/audio/{audio_id}",
            "metadata": "/api/metadata",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "noor-al-quran-backend"}

@app.get("/api/lessons")
async def get_lessons(label_name: Optional[str] = None):
    """Get available Tajweed lessons"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    filtered_df = df_dataset
    if label_name:
        # Convert Arabic name to English if needed
        english_name = get_english_lesson_name(label_name)
        if english_name is None:
            english_name = label_name
        filtered_df = df_dataset[df_dataset['label_name'].str.lower() == english_name.lower()]
    
    lessons = filtered_df.drop_duplicates(subset=['label_id', 'label_name', 'sheikh_id']).to_dict('records')
    return {
        "total": len(lessons),
        "lessons": lessons[:50]  # Paginate
    }

@app.get("/api/lessons/{label_name}/audio")
async def get_lesson_audio(
    label_name: str,
    available_only: bool = True,
    sheikh_name: Optional[str] = None,
    source: str = "auto",
):
    """Get all audio samples for a specific Tajweed lesson"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    # Convert Arabic name to English if needed
    english_name = get_english_lesson_name(label_name)
    if english_name is None:
        english_name = label_name  # Try using the name as-is if no mapping found
    
    base_samples = df_dataset[df_dataset['label_name'].str.lower() == english_name.lower()].copy()

    if base_samples.empty:
        raise HTTPException(status_code=404, detail=f"Lesson '{label_name}' not found in dataset. Tried: '{english_name}'")

    all_count = len(base_samples)
    sheikhs_all = sorted(base_samples['sheikh_name'].dropna().astype(str).unique().tolist())

    samples = base_samples
    if available_only:
        samples = samples[samples.apply(is_audio_available, axis=1)]

    playable_count = len(samples)

    if sheikh_name:
        samples = samples[samples['sheikh_name'].astype(str).str.lower() == sheikh_name.lower()]

    sheikhs_available = sorted(base_samples[base_samples.apply(is_audio_available, axis=1)]['sheikh_name'].dropna().astype(str).unique().tolist())

    # Optional Firebase source (auto/firebase)
    firebase_samples = []
    if source in ("auto", "firebase"):
        firebase_samples = get_firebase_samples(english_name, sheikh_name)
        if firebase_samples:
            return {
                "lesson_name": label_name,
                "english_name": english_name,
                "total_samples": len(firebase_samples),
                "all_samples_count": all_count,
                "playable_samples_count": playable_count,
                "available_only": available_only,
                "selected_sheikh": sheikh_name,
                "sheikhs_all": sheikhs_all,
                "sheikhs_available": sheikhs_available,
                "source": "firebase",
                "samples": firebase_samples,
            }

    # Include local availability in response
    samples = samples[['global_id', 'sheikh_name', 'new_file', 'audio_num', 'original_path', 'new_path']]\
        .sort_values(by=['sheikh_name', 'audio_num'])\
        .to_dict('records')
    
    return {
        "lesson_name": label_name,
        "english_name": english_name,
        "total_samples": len(samples),
        "all_samples_count": all_count,
        "playable_samples_count": playable_count,
        "available_only": available_only,
        "selected_sheikh": sheikh_name,
        "sheikhs_all": sheikhs_all,
        "sheikhs_available": sheikhs_available,
        "source": "google_drive",
        "samples": samples
    }

@app.get("/api/audio/{audio_id}")
async def get_audio(audio_id: str):
    """Stream audio file by ID"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    # Try to convert to int if possible
    try:
        audio_id_int = int(audio_id)
        audio_record = df_dataset[df_dataset['global_id'] == audio_id_int]
    except:
        audio_record = df_dataset[df_dataset['global_id'].astype(str) == audio_id]
    
    if audio_record.empty:
        raise HTTPException(status_code=404, detail=f"Audio '{audio_id}' not found")
    
    record = audio_record.iloc[0]
    local_path = find_local_dataset_audio_file(str(record.get('new_file', '')), str(record.get('global_id', '')))
    original_path = str(record.get('original_path', ''))
    new_file = str(record.get('new_file', ''))

    # 1) Converted/local dataset path
    if local_path and os.path.exists(local_path):
        media_type = guess_type(local_path)[0] or "audio/wav"
        return FileResponse(local_path, media_type=media_type, filename=os.path.basename(local_path))

    # 2) Mirrored Google Drive path (downloaded locally via gdown)
    mirrored = find_mirrored_audio_file(original_path, new_file)
    if mirrored and os.path.exists(mirrored):
        media_type = guess_type(mirrored)[0] or "audio/mpeg"
        return FileResponse(mirrored, media_type=media_type, filename=os.path.basename(mirrored))

    # 3) Not available yet; instruct caller to sync
    raise HTTPException(
        status_code=404,
        detail={
            "message": "Audio file not available locally",
            "audio_id": str(audio_id),
            "hint": "Run POST /api/admin/sync-drive to mirror Google Drive files locally",
            "mirror_dir": GDRIVE_MIRROR_DIR,
        },
    )

@app.get("/api/metadata")
async def get_metadata():
    """Get dataset statistics and metadata"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    return {
        "total_samples": len(df_dataset),
        "unique_labels": df_dataset['label_name'].nunique(),
        "unique_sheikhs": df_dataset['sheikh_name'].nunique(),
        "labels": df_dataset['label_name'].unique().tolist(),
        "sheikhs": df_dataset['sheikh_name'].unique().tolist()
    }


@app.get("/api/quran/surahs")
async def get_quran_surahs():
    """Get a list of all surahs with summary metadata."""
    if df_quran is None:
        raise HTTPException(status_code=503, detail="Quran dataset not loaded")

    grouped = df_quran.sort_values(['surah_no', 'ayah_no_surah']).groupby('surah_no', as_index=False).first()
    surahs = []
    for _, row in grouped.iterrows():
        surah_no = int(row['surah_no'])
        surah_rows = df_quran[df_quran['surah_no'] == surah_no]
        total_ayah = int(surah_rows['ayah_no_surah'].max())
        surahs.append({
            'surah_no': surah_no,
            'surah_name_en': json_safe(row['surah_name_en']),
            'surah_name_ar': json_safe(row['surah_name_ar']),
            'surah_name_roman': json_safe(row['surah_name_roman']),
            'total_ayah_surah': total_ayah,
            'place_of_revelation': json_safe(row.get('place_of_revelation', '')),
            'sajah_ayah': bool(str(row.get('sajah_ayah', '')).lower() == 'true'),
        })

    return {
        'total_surahs': len(surahs),
        'surahs': surahs,
    }


@app.get("/api/quran/surah/{surah_no}")
async def get_quran_surah(surah_no: int):
    """Get one surah with all ayahs."""
    if df_quran is None:
        raise HTTPException(status_code=503, detail="Quran dataset not loaded")

    surah_rows = df_quran[df_quran['surah_no'] == surah_no].sort_values('ayah_no_surah')
    if surah_rows.empty:
        raise HTTPException(status_code=404, detail=f"Surah {surah_no} not found")

    first = surah_rows.iloc[0]
    ayahs = []
    for _, row in surah_rows.iterrows():
        ayahs.append({
            'ayah_no_surah': int(row['ayah_no_surah']),
            'ayah_no_quran': int(row['ayah_no_quran']),
            'ayah_ar': json_safe(row['ayah_ar']),
            'ayah_en': json_safe(row['ayah_en']),
            'ruko_no': json_safe(row.get('ruko_no')),
            'juz_no': json_safe(row.get('juz_no')),
            'manzil_no': json_safe(row.get('manzil_no')),
            'hizb_quarter': json_safe(row.get('hizb_quarter')),
            'sajah_ayah': bool(str(row.get('sajah_ayah', '')).lower() == 'true'),
            'sajdah_no': None if str(row.get('sajdah_no', 'NA')).upper() == 'NA' else json_safe(row.get('sajdah_no')),
            'no_of_word_ayah': json_safe(row.get('no_of_word_ayah')),
            'list_of_words': json_safe(row.get('list_of_words', '')),
        })

    return {
        'surah_no': surah_no,
        'surah_name_en': json_safe(first['surah_name_en']),
        'surah_name_ar': json_safe(first['surah_name_ar']),
        'surah_name_roman': json_safe(first['surah_name_roman']),
        'total_ayah_surah': int(first['total_ayah_surah']),
        'place_of_revelation': json_safe(first.get('place_of_revelation', '')),
        'ayahs': ayahs,
    }

@app.post("/api/admin/sync-drive")
async def sync_drive_files():
    """Mirror public Google Drive dataset folder into local backend storage."""
    result = sync_google_drive_folder()
    if result["returncode"] != 0:
        return {
            "status": "partial",
            "message": "Google Drive sync completed with some inaccessible files",
            "mirror_dir": result["mirror_dir"],
            "stdout": result["stdout"],
            "stderr": result["stderr"],
        }
    return {
        "status": "ok",
        "message": "Google Drive mirror updated",
        "mirror_dir": result["mirror_dir"],
        "stdout": result["stdout"],
    }


@app.post("/api/admin/publish-firebase")
async def publish_samples_to_firebase(per_lesson: int = 100, available_only: bool = True):
    """Upload up to N samples per lesson into Firebase Storage and store metadata in Firestore."""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    if not firebase_enabled:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Firebase is not configured",
                "required_env": ["FIREBASE_STORAGE_BUCKET", "FIREBASE_SERVICE_ACCOUNT_PATH"],
                "service_account_path": FIREBASE_SERVICE_ACCOUNT_PATH,
            },
        )

    labels = sorted(df_dataset['label_name'].dropna().astype(str).unique().tolist())
    summary = {}
    total_uploaded = 0
    total_skipped = 0

    for label in labels:
        subset = df_dataset[df_dataset['label_name'].str.lower() == label.lower()].copy()
        if available_only:
            subset = subset[subset.apply(is_audio_available, axis=1)]

        subset = subset.sort_values(by=['sheikh_name', 'audio_num']).head(per_lesson)

        uploaded = 0
        skipped = 0
        errors = []
        for _, row in subset.iterrows():
            file_path = resolve_audio_file_path(row)
            if not file_path:
                skipped += 1
                continue
            try:
                upload_sample_to_firebase(row, file_path)
                uploaded += 1
            except Exception as e:
                skipped += 1
                errors.append(str(e))

        total_uploaded += uploaded
        total_skipped += skipped
        summary[label] = {
            "processed": len(subset),
            "uploaded": uploaded,
            "skipped": skipped,
            "errors": errors[:5],
        }

    return {
        "status": "ok",
        "per_lesson": per_lesson,
        "available_only": available_only,
        "total_uploaded": total_uploaded,
        "total_skipped": total_skipped,
        "summary": summary,
    }

@app.get("/api/sheikhs")
async def get_sheikhs():
    """Get list of Quranic scholars"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    sheikhs = df_dataset[['sheikh_id', 'sheikh_name']].drop_duplicates()
    return {
        "total": len(sheikhs),
        "sheikhs": sheikhs.to_dict('records')
    }

@app.get("/api/stats")
async def get_stats():
    """Get dataset statistics"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    stats_by_label = df_dataset.groupby('label_name').size().to_dict()
    stats_by_sheikh = df_dataset.groupby('sheikh_name').size().to_dict()

    available_df = df_dataset[df_dataset.apply(is_audio_available, axis=1)]
    playable_by_label = available_df.groupby('label_name').size().to_dict()
    playable_by_sheikh = available_df.groupby('sheikh_name').size().to_dict()

    return {
        "samples_by_label": stats_by_label,
        "samples_by_sheikh": stats_by_sheikh,
        "playable_by_label": playable_by_label,
        "playable_by_sheikh": playable_by_sheikh,
        "playable_total": len(available_df),
        "total_samples": len(df_dataset)
    }

@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Upload user-recorded audio for analysis"""
    if not file.filename.endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="Only audio files are accepted")
    
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    return {
        "status": "uploaded",
        "filename": file.filename,
        "path": file_path,
        "analysis_url": f"/api/analyze/{file.filename}"
    }

@app.post("/api/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """Analyze uploaded audio for Tajweed accuracy"""
    if not file.filename.endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="Only audio files are accepted")
    
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    # Mock analysis (In production, integrate with ML model for audio feature extraction)
    analysis = {
        "accuracy": 85,
        "feedback": "تلاوة جيدة مع انتباه للأحكام",
        "strengths": [
            "نطق صحيح للمخارج",
            "التزام بالمدود",
            "وضوح الصوت"
        ],
        "improvements": [
            "اهتم بالتشديد في النون الساكنة",
            "مد الياء يحتاج لزيادة طفيفة"
        ],
        "tajweed_rules": {
            "noon_sakinah": "متوسط",
            "madd": "جيد",
            "qalqala": "جيد",
            "ikhfa": "ممتاز"
        }
    }
    
    return analysis

@app.post("/api/submissions")
async def save_submission(user_id: str, lesson_name: str, accuracy: float, file: UploadFile = File(...)):
    """Save user submission for progress tracking"""
    if not file.filename.endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="Only audio files are accepted")
    
    submissions_dir = f"./submissions/{user_id}/{lesson_name}"
    os.makedirs(submissions_dir, exist_ok=True)
    
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(submissions_dir, f"{timestamp}_{file.filename}")
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    return {
        "status": "saved",
        "submission_id": timestamp,
        "accuracy": accuracy,
        "path": file_path
    }

@app.get("/api/compare-audio/{sample_id}")
async def compare_with_reference(sample_id: str, user_file: str = None):
    """Compare user audio with reference audio sample"""
    if df_dataset is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    reference = df_dataset[df_dataset['global_id'] == sample_id]
    if reference.empty:
        raise HTTPException(status_code=404, detail=f"Reference audio '{sample_id}' not found")
    
    # Mock comparison (In production, use librosa for audio analysis)
    comparison = {
        "user_accuracy": 82,
        "reference_sample": sample_id,
        "reference_sheikh": reference.iloc[0]['sheikh_name'],
        "differences": [
            {"type": "timing", "severity": "low", "description": "تأخير طفيف في المد"},
            {"type": "pronunciation", "severity": "medium", "description": "نطق الحرف غير دقيق"}
        ]
    }
    return comparison

