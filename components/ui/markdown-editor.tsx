'use client';

import { useState, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Enter markdown content...",
  disabled = false,
  height = 200
}: MarkdownEditorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        setIsUploading(true);
        toast.loading('Uploading image...', { id: 'image-upload' });

        try {
          const { data, error } = await apiService.uploadImageFromClipboard(file);
          
          if (error) {
            toast.error(error, { id: 'image-upload' });
            return;
          }

          if (data) {
            // Insert markdown image syntax at cursor position
            const imageMarkdown = `![Image](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${data.url})`;
            const newValue = value + '\n' + imageMarkdown;
            onChange(newValue);
            toast.success('Image uploaded successfully!', { id: 'image-upload' });
          }
        } catch (error) {
          toast.error('Failed to upload image', { id: 'image-upload' });
        } finally {
          setIsUploading(false);
        }
      }
    }
  }, [value, onChange]);

  const handleDrop = useCallback(async (event: DragEvent) => {
    event.preventDefault();
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    setIsUploading(true);
    toast.loading('Uploading image...', { id: 'image-upload' });

    try {
      const { data, error } = await apiService.uploadImage(file);
      
      if (error) {
        toast.error(error, { id: 'image-upload' });
        return;
      }

      if (data) {
        const imageMarkdown = `![${file.name}](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${data.url})`;
        const newValue = value + '\n' + imageMarkdown;
        onChange(newValue);
        toast.success('Image uploaded successfully!', { id: 'image-upload' });
      }
    } catch (error) {
      toast.error('Failed to upload image', { id: 'image-upload' });
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange]);

  return (
    <div 
      className="relative"
      onPaste={handlePaste as any}
      onDrop={handleDrop as any}
      onDragOver={(e) => e.preventDefault()}
    >
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        data-color-mode="light"
        height={height}
        preview="edit"
        hideToolbar={false}
        visibleDragbar={false}
        textareaProps={{
          placeholder,
          disabled: disabled || isUploading,
          style: {
            fontSize: 14,
            lineHeight: 1.5,
          }
        }}
      />
      {isUploading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <div className="text-sm text-gray-600">Uploading image...</div>
        </div>
      )}
      <div className="text-xs text-gray-500 mt-1">
        💡 Tip: Paste images directly from clipboard or drag & drop image files
      </div>
    </div>
  );
}
