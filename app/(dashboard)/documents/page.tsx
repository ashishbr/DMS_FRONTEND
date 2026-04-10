import { ProcessedDocumentsViewer } from "@/components/documents/processed-documents-viewer";
import { MsaBuckets } from "@/components/documents/msa-buckets";
import { DocumentClientMapper } from "@/components/documents/document-client-mapper";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <DocumentClientMapper />
      <MsaBuckets />
      <ProcessedDocumentsViewer />
    </div>
  );
}
