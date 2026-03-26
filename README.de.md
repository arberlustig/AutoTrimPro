# AutoTrimPro

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/arberlustig/AutoTrimPro/blob/main/README.md)
[![de](https://img.shields.io/badge/lang-de-yellow.svg)](https://github.com/arberlustig/AutoTrimPro/blob/main/README.de.md)

AutoTrimPro ist eine robuste, lokale Desktop-Anwendung, die mit Electron, React und Vite erstellt wurde. Sie erkennt automatisch Stille in deinen Video- oder Audiodateien und exportiert nahtlos eine getrimmte (geschnittene) Timeline, wodurch du Stunden an mühsamer manueller Videobearbeitung sparst.

HINWEIS: Wenn du beim Abspielen der Wellenform-Vorschau (Waveform) eine schlechte Audioqualität erlebst, keine Sorge! Beim Exportieren der geschnittenen Version ist das Audio völlig in Ordnung, wenn du es in Premiere Pro einfügst! Ich werde auf jeden Fall noch ein Video teilen, wie man alles richtig einstellt und wie das Programm gedacht ist!

Ich entwickle AutoTrim Pro als Open-Source-Projekt, weil ich davon überzeugt bin, dass kostenlose Software einen Mehrwert für alle bietet. Das Programm wird daher dauerhaft für jeden frei zugänglich bleiben. Falls du meine Arbeit am Code schätzt, kannst du das Projekt gerne mit einem Beitrag deiner Wahl unterstützen. Das ist absolut optional und eine reine Geste der Anerkennung 🤝 https://paypal.me/ArberBaui

## Funktionen

- **Automatisierte Stille-Erkennung**: Analysiert Audio mit den leistungsstarken `silencedetect`-Algorithmen von `ffmpeg`.
- **Anpassbares Schneiden**: Bestimme mit intuitiven Schiebereglern ganz genau, was als "Stille" und was als "Sprache" gilt.
- **Wellenform-Vorschau**: Überprüfe die Audiospuren visuell und sehe dir exakt an, wo die Schnitte gesetzt werden.
- **Export-Optionen**: Erstellt eine **Premiere Pro XML (FCP7)** mit der bereits geschnittenen Timeline, bereit für den Import, oder wahlweise eine MP4.

## Wie man AutoTrimPro benutzt

AutoTrimPro ist darauf ausgelegt, schnell und intuitiv zu sein. Hier ist eine Übersicht der wichtigsten Verarbeitungsparameter und was sie bewirken:

### 1. Verarbeitungsparameter (Processing Parameters)

- **Silence Threshold (dB) (Stille-Schwellenwert)**: Legt die Lautstärke fest, unterhalb derer Audio als "still" betrachtet wird. Je niedriger die negative Zahl (z.B. -50 dB), desto leiser muss der Hintergrund sein, um weggeschnitten zu werden. Wenn die App deine leise Sprache wegschneidet, erhöhe diesen Wert (z.B. auf -25 dB).
- **Minimum Silence (s) (Minimale Stilledauer)**: Die minimale Dauer einer Pause, die benötigt wird, um einen Schnitt auszulösen. Wenn dies auf `0.5s` gesetzt ist, werden Pausen ignoriert, die kürzer als eine halbe Sekunde sind, wodurch natürliche Sprachflüsse intakt bleiben.
- **Minimum Speech (s) (Minimale Sprachdauer)**: Die minimale Dauer, die ein gesprochener Abschnitt lang sein muss, um behalten zu werden. Wenn jemand ein kurzes Geräusch (wie ein Mikrofon-Rumpeln) für `0.1s` macht, dieser Wert aber auf `0.3s` gesetzt ist, wird das Geräusch als Stille behandelt und entfernt.
- **Padding Margin (s) (Puffer-Rand)**: Fügt einen "Sicherheitspuffer" an Audio vor und nach den Sprachabschnitten hinzu. Dies verhindert, dass Wörter am Anfang oder Ende abrupt abgeschnitten klingen.

### 2. Medienspuren (Media Tracks)

Wenn du eine Datei importierst, listet AutoTrimPro alle verfügbaren Audiospuren auf (nützlich für Videoaufnahmen mit mehreren Spuren, wie Gameplay oder Podcasts).

- **Detect Silence**: Wähle dies für Spuren aus, denen der Algorithmus zuhören soll (z.B. möchtest du basierend auf deiner Mikrofonspur schneiden, aber die Gameplay-Audiospur ignorieren).
- **Export Cut**: Wähle dies aus, wenn du möchtest, dass diese Spur in deinem final exportierten XML/MP4 enthalten ist.
- **Load Waveform Preview**: Klicke hierauf, um das Audio zu visualisieren und genau zu sehen, wo sich die erkannten stillen (hervorgehobenen) Bereiche befinden.

### 3. Ausgabe-Einstellungen (Output Settings)

- **Export Format**: Wähle zwischen einer Premiere-kompatiblen XML (welche eine bearbeitbare Sequenz in Premiere Pro erstellt, in der alle Schnitte angewendet sind) oder einem MP4-Render.
- **Output Folder**: Wähle aus, wo die finalen Dateien gespeichert werden sollen. Klicke auf **Execute Export**, wenn du bereit bist!

---

- Node.js (v18+ LTS empfohlen)

## Einrichtung

1. Kopiere oder klone das Repository:
   ```bash
   git clone <deine-repo-url>
   cd autotrimpro
   ```
2. Installiere die Abhängigkeiten:
   ```bash
   npm install
   ```

## Entwicklung

Starte die App im Entwicklungsmodus (startet sowohl das Vite-Frontend als auch das Electron-Backend):

```bash
npm run dev
```

_(Hinweis: Beim ersten Ausführen wird der Electron-Main-Prozess kompiliert und die React-Ausgabe in einem Electron-Fenster geöffnet)_

Um die ausführbare Datei für dein Betriebssystem (Windows) zu erstellen (Build):

```bash
npm run build:win
```

Dies erstellt einen Ordner `release/` mit deinem `.exe`-Installer.

Um einen regulären Build durchzuführen, ohne den Installer zu bündeln:

```bash
npm run build
npm start
```
