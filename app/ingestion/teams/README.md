# Teams Transcript Ingestion

Fetches meeting transcripts from Microsoft Graph API and saves them as raw `.vtt`
files under `data/transcripts/teams/`.

---

## Azure AD app registration

### 1. Create an app registration

In Azure Portal → **Microsoft Entra ID → App registrations → New registration**.

- Name: `Meeting Archaeologist`
- Supported account types: single tenant
- No redirect URI needed (daemon / app-only flow)

### 2. Add API permissions

Under **API permissions → Add a permission → Microsoft Graph → Application permissions**, add:

| Permission | Why |
|---|---|
| `OnlineMeetings.Read.All` | List meetings for the target user |
| `OnlineMeetingTranscript.Read.All` | Fetch transcript content (VTT) |

Both must be **Application permissions** (not Delegated). Click **Grant admin consent**.

### 3. Create a client secret

Under **Certificates & secrets → New client secret**. Copy the value immediately — it
won't be shown again.

### 4. Teams application access policy (required — often missed)

`OnlineMeetings.Read.All` as an Application permission requires an explicit policy grant
in Teams via PowerShell, separate from the Azure AD admin consent above. Without this,
API calls return `403 Forbidden` even with consent.

```powershell
# Run in Teams PowerShell module (Install-Module MicrosoftTeams)
Connect-MicrosoftTeams

New-CsApplicationAccessPolicy `
  -Identity "MeetingArchaeologist" `
  -AppIds "<AZURE_CLIENT_ID>" `
  -Description "Meeting Archaeologist transcript access"

Grant-CsApplicationAccessPolicy `
  -PolicyName "MeetingArchaeologist" `
  -Identity "<TEAMS_TARGET_USER_ID>"   # UPN or object ID of the target user
```

Allow up to 30 minutes for the policy to propagate.

### 5. Teams transcription prerequisite

Transcripts are only available if:
- The tenant has a **Teams Premium** or **Teams Essentials** licence that includes
  transcription.
- The target user has transcription enabled in their Teams meeting policy.
- The meeting was recorded/transcribed — transcription must be started in the meeting.

If a meeting has no transcript the API returns an empty list; the ingestion silently
skips it.

---

## Environment variables

Add to `.env`:

```
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your-client-secret-value
TEAMS_TARGET_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # object ID of organizer

# Optional — defaults to data/transcripts/teams/
# INGESTION_BASE_DIR=/absolute/path/to/output
```

---

## Output layout

```
data/transcripts/teams/
  {safe_meeting_id}/
    {safe_transcript_id}.vtt    # raw VTT content from Graph
    metadata.json               # meeting + transcript metadata
```

`metadata.json` shape:

```json
{
  "source": "teams",
  "meeting_id": "...",
  "subject": "...",
  "organizer": {"id": "...", "display_name": "..."},
  "start_time": "2025-01-01T10:00:00Z",
  "end_time": "2025-01-01T11:00:00Z",
  "participants": [{"id": "...", "display_name": "..."}],
  "transcripts": [
    {
      "transcript_id": "...",
      "created_date_time": "2025-01-01T10:05:00Z",
      "file_path": "data/transcripts/teams/.../....vtt",
      "fetched_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```

When a meeting gains a second transcript, re-running appends to `transcripts[]`
without overwriting the file.

---

## Running

```bash
# Last 7 days
python -m app.ingestion.teams.cli ingest --since 7d

# Last 24 hours
python -m app.ingestion.teams.cli ingest --since 24h

# Specific window
python -m app.ingestion.teams.cli ingest \
  --since 2025-01-01T00:00:00+00:00 \
  --until 2025-01-07T23:59:59+00:00
```

Via the API (once `uvicorn app.main:app` is running):

```
POST /ingestion/teams/run?since=7d
```

---

## Running tests

```bash
pytest tests/ingestion/teams/ -v
```
