# 📄 DocScanner

A React Native (Android) app that scans documents with automatic edge detection, extracts text using on-device OCR, and exports the result as a shareable PDF.

## Features

- **Auto Edge Detection & Crop** — powered by Google ML Kit's Document Scanner, with live perspective correction (no manual cropping needed)
- **On-Device Text Recognition (OCR)** — extracted via Google ML Kit Text Recognition, fully offline
- **Multi-Page Scanning** — scan several pages in one session; text from all pages is combined automatically
- **Editable Extracted Text** — review and correct OCR output before exporting
- **PDF Export & Share** — turn the extracted text into a PDF and share it directly from the app
- **Scan History** — past scans are saved locally with date, page count, and a text preview, so previous PDFs can be reshared anytime

## Tech Stack

- React Native CLI (bare workflow)
- [`react-native-document-scanner-plugin`](https://github.com/websitebeaver/react-native-document-scanner-plugin) — Google ML Kit Document Scanner (Android)
- **ML Kit Text Recognition** (`com.google.mlkit:text-recognition:16.0.1`) — custom native module (`TextRecognizerModule.kt`)
- `react-native-print` — PDF generation from HTML
- `react-native-share` — native share sheet for the generated PDF
- `@react-native-async-storage/async-storage` — local scan history

## Project Structure

```
android/app/src/main/java/com/docscannerapp/
  ├── TextRecognizerModule.kt     # ML Kit OCR bridge (recognizeText)
  └── TextRecognizerPackage.kt    # Registers the native module
App.tsx                            # Scan → Extract → Edit → Export → Share flow
```

## Setup

```bash
npm install --legacy-peer-deps
npx react-native run-android
```

> Note: `--legacy-peer-deps` is needed due to a peer dependency conflict from `react-native-windows` in this project's dependency tree.

## How It Works

1. Tap **Scan Document** — the native Google ML Kit scanner UI opens with live edge detection and lets you capture one or more pages
2. Each page is run through on-device OCR and the text is combined (with page markers for multi-page scans)
3. Review and edit the extracted text directly in the app
4. Tap **Export PDF** to generate a PDF from the (edited) text, then **Share PDF** to send it anywhere
5. Every export is saved to **Scan History** for quick access later

## Roadmap

- [ ] Grayscale / contrast enhancement toggle before OCR for low-light scans
- [ ] Thumbnails in the history list
- [ ] Multi-language OCR support
