'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { isMobileOrTablet } from '@/lib/utils';

export interface StoredPdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Chemin dans le bucket Supabase `documents` */
  storagePath: string | null;
  downloadFileName: string;
}

/**
 * Prévisualisation PDF depuis le storage (même rendu que Facture / Relevé / etc. sur la fiche client) :
 * fetch signé, PDF.js + canvas sur desktop, iframe sur mobile/tablette, pagination, téléchargement.
 */
export function StoredPdfPreviewDialog({
  open,
  onOpenChange,
  title,
  storagePath,
  downloadFileName,
}: StoredPdfPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<{
    getPage: (n: number) => Promise<unknown>;
    numPages: number;
  } | null>(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPdfUrl(null);
      setPdfBlob(null);
      setPdfDoc(null);
      setNumPages(null);
      setCurrentPage(1);
      setUseIframeFallback(false);
      setLoading(false);
      return;
    }

    setUseIframeFallback(isMobileOrTablet());
    setCurrentPage(1);
    setPdfDoc(null);
    setNumPages(null);
    setPdfBlob(null);
    setPdfUrl(null);

    if (!storagePath) {
      toast.error('Aucun fichier associé à ce document.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 3600);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('URL non disponible');

        const response = await fetch(data.signedUrl);
        if (!response.ok) throw new Error('Téléchargement impossible');
        const blob = await response.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(url);
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error('Impossible de charger le document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, storagePath]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfBlob || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs';
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(doc as { getPage: (n: number) => Promise<unknown>; numPages: number });
        setNumPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF with pdfjs:', err);
        if (cancelled) return;
        setUseIframeFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob, open]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !open) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    setPageRendering(true);
    (async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;
        const pageProxy = page as {
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: {
            canvasContext: CanvasRenderingContext2D;
            viewport: { width: number; height: number };
          }) => { promise: Promise<void> };
        };
        const baseViewport = pageProxy.getViewport({ scale: 1 });
        const containerW = containerRef.current?.clientWidth || window.innerWidth * 0.9;
        const baseScale = Math.min(
          5,
          Math.max(2, Math.max(containerW - 32, 200) / baseViewport.width)
        );
        const scale = baseScale * Math.min(1.5, window.devicePixelRatio || 1);
        const viewport = pageProxy.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderCtx = { canvasContext: ctx, viewport };
        await pageProxy.render(renderCtx).promise;
        if (cancelled) return;
      } catch (err) {
        console.error('Error rendering PDF page:', err);
      } finally {
        if (!cancelled) setPageRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, open]);

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = downloadFileName || 'document.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Document téléchargé');
  };

  const showViewer = !loading && pdfUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <DialogTitle className="pr-8">{title || 'Prévisualisation'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100 flex flex-col p-2 overflow-hidden">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-600" />
              <p className="text-slate-600">Chargement du document…</p>
            </div>
          ) : showViewer ? (
            <>
              <div
                ref={containerRef}
                className="pdf-preview-scroll flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain rounded border border-slate-300 bg-white shadow-lg flex items-start justify-center p-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {useIframeFallback ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full min-h-[200px] rounded border-0"
                    title="Prévisualisation du PDF"
                  />
                ) : !pdfDoc ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    <p className="text-sm text-slate-600">Préparation du PDF…</p>
                  </div>
                ) : (
                  <div className="relative flex flex-1 items-start justify-center min-h-0 w-full">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto rounded shadow-sm"
                      style={{ opacity: pageRendering ? 0.6 : 1 }}
                    />
                    {pageRendering && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!useIframeFallback && (numPages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-2 py-2 border-t bg-slate-50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || !pdfDoc}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Page précédente
                  </Button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {currentPage}
                    {numPages != null ? ` / ${numPages}` : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(numPages ?? p, p + 1))}
                    disabled={numPages != null && currentPage >= numPages}
                  >
                    Page suivante
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-slate-600">
              <p>Document non disponible</p>
            </div>
          )}
        </div>

        <div className="flex justify-end items-center gap-3 px-6 py-3 border-t bg-white flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleDownloadPDF} disabled={!pdfBlob || loading}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
