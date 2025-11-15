# /stop Command Implementation für Discord Bot

## Ziel
ESC-ähnliche Interrupt-Funktionalität für laufende Claude-Anfragen im Discord Bot implementieren.

## Problem
- User startet lange Claude-Antwort
- Will diese abbrechen (wie ESC in Claude Code)
- Danach sofort neue Frage stellen können

## Lösung: `stream.close()`

Die Anthropic Python SDK unterstützt **first-class stream cancellation**:

```python
async with client.messages.stream(...) as stream:
    # Bei Bedarf:
    stream.close()  # Bricht Request bei Anthropic ab
```

### Wichtig
- `stream.close()` killt **nur den aktuellen Stream**
- Der `client` (AsyncAnthropic) bleibt offen
- Neue Requests funktionieren sofort danach
- User zahlt nur für tatsächlich generierte Tokens bis zum Abbruch

## Implementierung

### 1. Global Stream Tracking
```python
# Tracking aktiver Streams per User
active_streams = {}  # user_id -> stream object
```

### 2. /stop Command
```python
@bot.command()
async def stop(ctx):
    stream = active_streams.get(ctx.author.id)
    if stream:
        stream.close()  # Bricht Stream ab
        await ctx.send("🛑 Gestoppt")
    else:
        await ctx.send("❌ Keine aktive Anfrage")
```

### 3. Message Handler Updates
```python
async def handle_claude_request(message):
    async with client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[{"role": "user", "content": message.content}]
    ) as stream:
        # Registriere Stream für /stop
        active_streams[message.author.id] = stream

        try:
            async for text in stream.text_stream:
                # Update Discord message...
                pass
        finally:
            # Cleanup nach Completion oder Stop
            active_streams.pop(message.author.id, None)
```

## User Flow

1. **User**: "Schreib einen Roman über Quantenphysik"
   - Bot startet Streaming-Antwort
   - Stream wird in `active_streams` registriert

2. **User**: `/stop`
   - Command findet Stream in `active_streams`
   - Ruft `stream.close()` auf
   - Anthropic stoppt Generation
   - Bot zeigt "🛑 Gestoppt"

3. **User**: "Was ist 2+2?"
   - Neue Request startet sofort
   - Kein Connection-Problem, da nur Stream (nicht Client) geschlossen wurde

## Technische Details

### Was passiert bei `stream.close()`?
- HTTP-Connection zu Anthropic wird für **diesen Stream** geschlossen
- Anthropic stoppt Token-Generation
- **Keine weiteren Kosten** für ungenerierte Tokens
- Client-Connection bleibt intakt für neue Requests

### Unterschied zu anderen Ansätzen
- ❌ **Soft Stop** (nur aufhören zu lesen): Anthropic generiert weiter, volle Kosten
- ❌ **Connection Drop**: Killt gesamten Client, neue Requests nicht möglich
- ✅ **stream.close()**: Sauberer Abbruch, sofort bereit für neue Requests

## Nächste Schritte

1. Code in `discord-server/` lokalisieren
2. `active_streams` Dictionary hinzufügen
3. `/stop` Command implementieren
4. Message Handler updaten (Stream registrieren/cleanup)
5. Testen:
   - Lange Antwort starten
   - `/stop` während Generation
   - Neue Frage sofort danach

## Referenzen

- [Anthropic Python SDK Streaming Docs](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/lib/streaming/_messages.py)
- `stream.close()` dokumentiert als "Aborts the request"
