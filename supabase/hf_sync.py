# =============================================================
# CaawiyeAI · Supabase Edge Function — Hugging Face sync
# =============================================================
# Triggered manually (or by a scheduled job) to push the accepted
# dataset into a Hugging Face repository.

import os
import json
import io
import requests
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HF_TOKEN = os.environ["HF_TOKEN"]
HF_REPO = os.environ["HF_REPO"]  # e.g. "CaawiyeAI/somali-voices"
HF_REPO_URL = f"https://huggingface.co/api/datasets/{HF_REPO}"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def main():
    # 1) Grab every accepted clip
    rows = (
        supabase.table("datasets")
        .select("id, sentence, audio_url, duration, gender, age_group, device")
        .eq("status", "accepted")
        .limit(1000)
        .execute()
        .data
    )
    if not rows:
        print("No accepted clips to push.")
        return

    # 2) Build metadata.csv
    header = "client_id,sentence,duration,gender,age_group,device\n"
    lines = [
        f"{r['id']},{r['sentence']},{r['duration']},{r.get('gender','')},{r.get('age_group','')},{r.get('device','')}"
        for r in rows
    ]
    csv_bytes = (header + "\n".join(lines)).encode("utf-8")

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}

    # 3) Upload metadata.csv via the HF upload endpoint
    resp = requests.put(
        f"{HF_REPO_URL}/upload/main/metadata.csv",
        headers=headers,
        data=csv_bytes,
    )
    resp.raise_for_status()

    # 4) Upload each audio file (best effort, skip failures)
    for r in rows:
        audio_url = r.get("audio_url")
        if not audio_url:
            continue
        audio = requests.get(audio_url, timeout=30)
        if not audio.ok:
            continue
        ext = audio_url.rsplit(".", 1)[-1].split("?")[0]
        path = f"audio/{r['id']}.{ext or 'webm'}"
        up = requests.put(
            f"{HF_REPO_URL}/upload/main/{path}",
            headers=headers,
            data=audio.content,
        )
        if not up.ok:
            print(f"failed {path}: {up.status_code}")

    print(f"Pushed {len(rows)} clips to {HF_REPO}")


if __name__ == "__main__":
    main()