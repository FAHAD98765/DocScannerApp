import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  NativeModules,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Screen = 'idle' | 'result' | 'history';

type HistoryEntry = {
  id: string;
  date: string;
  pageCount: number;
  textPreview: string;
  pdfPath: string;
};

const HISTORY_KEY = 'docscanner_history';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('idle');

  // --- Multi-page scan state ---
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  // --- History state ---
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'Camera access is needed to scan documents',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  // ---------- SCAN (multi-page) ----------
  const handleScanDocument = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Cannot scan without camera permission');
      return;
    }

    try {
      // maxNumDocuments is set high so the user can scan multiple pages in one session
      const { scannedImages: images } = await DocumentScanner.scanDocument({
        maxNumDocuments: 10,
      });

      if (images && images.length > 0) {
        setScannedImages(images);
        setExtractedText('');
        setPdfPath(null);
        setScreen('result');
        handleExtractTextAllPages(images);
      }
    } catch (error: any) {
      Alert.alert('Scan Error', error.message || 'Could not scan the document');
    }
  };

  // ---------- OCR on every page, combine ----------
  const handleExtractTextAllPages = async (images: string[]) => {
    setIsProcessing(true);
    try {
      const pageTexts: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const result = await NativeModules.TextRecognizer.recognizeText(images[i]);
        const pageText = result.fullText || '(No text found on this page)';
        pageTexts.push(
          images.length > 1 ? `--- Page ${i + 1} ---\n${pageText}` : pageText,
        );
      }
      setExtractedText(pageTexts.join('\n\n'));
    } catch (error: any) {
      Alert.alert('Recognition Error', error.message || 'Could not extract text');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRescan = () => {
    setScannedImages([]);
    setExtractedText('');
    setPdfPath(null);
    setScreen('idle');
  };

  // ---------- Export PDF (uses the edited text) ----------
  const handleExportPDF = async () => {
    if (!extractedText) return;
    try {
      const htmlContent = `
        <html>
          <body style="padding: 20px; font-family: Arial;">
            <h2>Scanned Document</h2>
            <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
              ${extractedText.replace(/\n/g, '<br/>')}
            </p>
          </body>
        </html>
      `;
      const filePath = await RNPrint.print({
        html: htmlContent,
        fileName: `scan_${Date.now()}`,
        isLandscape: false,
      });
      setPdfPath(filePath);
      await saveToHistory(filePath);
      Alert.alert('PDF Created!', `Saved to:\n${filePath}`);
    } catch (error: any) {
      Alert.alert('PDF Error', error.message || 'Could not create the PDF');
    }
  };

  const handleSharePDF = async (path: string) => {
    try {
      await Share.open({
        url: `file://${path}`,
        type: 'application/pdf',
      });
    } catch (error) {
      // User cancelled the share sheet, ignore
    }
  };

  // ---------- History (AsyncStorage) ----------
  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch (error) {
      setHistory([]);
    }
  };

  const saveToHistory = async (path: string) => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const existing: HistoryEntry[] = raw ? JSON.parse(raw) : [];

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        pageCount: scannedImages.length,
        textPreview: extractedText.slice(0, 100),
        pdfPath: path,
      };

      const updated = [entry, ...existing];
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      // Don't crash the app if history fails to save
    }
  };

  const openHistory = () => {
    loadHistory();
    setScreen('history');
  };

  // ---------- SCREEN: Idle ----------
  if (screen === 'idle') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>📄 DocScanner</Text>
        <Text style={styles.subtitle}>Scan a document, edit the text, export as PDF</Text>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanDocument}>
          <Text style={styles.scanButtonText}>📷 Scan Document</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.historyLinkButton} onPress={openHistory}>
          <Text style={styles.historyLinkText}>🕘 Scan History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------- SCREEN: History ----------
  if (screen === 'history') {
    return (
      <View style={styles.resultContainer}>
        <View style={styles.historyHeader}>
          <TouchableOpacity onPress={() => setScreen('idle')}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.historyHeaderTitle}>Scan History</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.subtitle}>No scans yet</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <Text style={styles.historyDate}>{item.date}</Text>
                <Text style={styles.historyPages}>{item.pageCount} page(s)</Text>
                <Text style={styles.historyPreview} numberOfLines={2}>
                  {item.textPreview}
                </Text>
                <TouchableOpacity
                  style={styles.historyShareButton}
                  onPress={() => handleSharePDF(item.pdfPath)}
                >
                  <Text style={styles.actionButtonText}>📤 Share PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ---------- SCREEN: Result (editable text) ----------
  return (
    <ScrollView style={styles.resultContainer} contentContainerStyle={{ padding: 16 }}>
      <Image
        source={{ uri: scannedImages[0] }}
        style={styles.previewImage}
        resizeMode="contain"
      />
      {scannedImages.length > 1 && (
        <Text style={styles.pageCountText}>{scannedImages.length} pages scanned</Text>
      )}

      {isProcessing && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color="#FFD60A" />
          <Text style={styles.processingText}>Extracting text...</Text>
        </View>
      )}

      {!isProcessing && extractedText !== '' && (
        <View style={styles.textBox}>
          <Text style={styles.textBoxTitle}>📄 Extracted Text (editable)</Text>
          <TextInput
            style={styles.extractedTextInput}
            value={extractedText}
            onChangeText={setExtractedText}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRescan}>
          <Text style={styles.actionButtonText}>🔄 Rescan</Text>
        </TouchableOpacity>

        {extractedText !== '' && !pdfPath && (
          <TouchableOpacity style={[styles.actionButton, styles.pdfButton]} onPress={handleExportPDF}>
            <Text style={styles.actionButtonText}>📥 Export PDF</Text>
          </TouchableOpacity>
        )}

        {pdfPath && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => handleSharePDF(pdfPath)}
          >
            <Text style={styles.actionButtonText}>📤 Share PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#FFD60A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  historyLinkButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  historyLinkText: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: { flex: 1, backgroundColor: '#111' },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  pageCountText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  processingBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  textBox: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
  },
  textBoxTitle: {
    color: '#FFD60A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  extractedTextInput: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 150,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pdfButton: { backgroundColor: '#FFD60A' },
  shareButton: { backgroundColor: '#00BFFF' },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 16,
  },
  backText: {
    color: '#00BFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  historyHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  historyDate: {
    color: '#FFD60A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyPages: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
  },
  historyPreview: {
    color: '#ddd',
    fontSize: 13,
    marginBottom: 10,
  },
  historyShareButton: {
    backgroundColor: '#00BFFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default App;