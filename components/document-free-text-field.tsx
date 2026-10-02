'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DOCUMENT_FREE_TEXT,
  clampDocumentFreeTextInput,
  countDocumentFreeTextLines,
  normalizeDocumentFreeText,
} from '@/lib/document-free-text';

type DocumentFreeTextFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
};

/**
 * Saisie du texte libre affiché sous l'encart client des PDF.
 * Limite : 3 lignes × largeur encart (76 mm, Helvetica 9).
 */
export function DocumentFreeTextField({
  id = 'document-free-text',
  label = 'Texte libre (PDF)',
  value,
  onChange,
  disabled = false,
  className,
  description = 'Affiché sous le numéro client sur le PDF (3 lignes max).',
}: DocumentFreeTextFieldProps) {
  const lines = countDocumentFreeTextLines(value);
  const charCount = normalizeDocumentFreeText(value).length;

  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs text-slate-600">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        rows={3}
        placeholder="Note visible sur le document PDF…"
        className="mt-1 min-h-[4.5rem] resize-none text-sm"
        onChange={(e) => {
          onChange(clampDocumentFreeTextInput(e.target.value));
        }}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = e.clipboardData.getData('text');
          onChange(clampDocumentFreeTextInput(`${value}${pasted}`));
        }}
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{description}</span>
        <span className="shrink-0 tabular-nums">
          {lines}/{DOCUMENT_FREE_TEXT.maxLines} lignes · {charCount}/{DOCUMENT_FREE_TEXT.softMaxChars}
        </span>
      </div>
    </div>
  );
}
