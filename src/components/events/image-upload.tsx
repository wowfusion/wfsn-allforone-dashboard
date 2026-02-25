'use client';

/**
 * Bild-Upload Komponente für Events.
 * Konvertiert das gewählte Bild clientseitig zu Base64 (Data-URI).
 * Discord erwartet genau dieses Format beim image-Feld eines Scheduled Events.
 * Max. Dateigröße: 1 MB. Erlaubte Formate: JPEG, PNG, GIF, WebP.
 */

import { useRef, useState } from 'react';
import { ImageIcon, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageUploadProps {
  /** Aktueller Base64-Wert (Data-URI) */
  value?: string;
  onChange: (base64: string | undefined) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Erlaubte Formate: JPEG, PNG, GIF, WebP');
      return;
    }

    if (file.size > MAX_BYTES) {
      setError('Datei zu groß – max. 1 MB erlaubt');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    onChange(undefined);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {value ? (
        /* Vorschau */
        <div className="relative w-full rounded-lg overflow-hidden border border-border/60 bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Event Cover"
            className="w-full max-h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-7 w-7 p-0"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        /* Drop-Zone */
        <div
          className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-lg border-2 border-dashed border-border/60 hover:border-amber-400/50 hover:bg-amber-400/5 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-7 w-7 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Bild hierher ziehen oder{' '}
              <span className="text-amber-400 font-medium">auswählen</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">JPEG, PNG, GIF, WebP · max. 1 MB</p>
          </div>
          <Upload className="h-3.5 w-3.5 text-muted-foreground/40" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={handleChange}
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
