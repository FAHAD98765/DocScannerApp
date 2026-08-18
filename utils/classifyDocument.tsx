export type DocumentType = 'Receipt' | 'ID Card' | 'Document';

export function classifyDocumentType(text: string): DocumentType {
  const lower = text.toLowerCase();

  const receiptKeywords = ['total', 'subtotal', 'invoice', 'amount due', 'tax', 'receipt', 'qty', 'rs.', '$', 'paid'];
  const idKeywords = ['date of birth', 'passport', 'license', 'national id', 'government', 'gender', 'nationality', 'expiry'];

  const receiptScore = receiptKeywords.filter(k => lower.includes(k)).length;
  const idScore = idKeywords.filter(k => lower.includes(k)).length;

  if (receiptScore >= 2) return 'Receipt';
  if (idScore >= 2) return 'ID Card';
  return 'Document';
}