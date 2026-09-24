import { useState, type FormEvent } from 'react';
import type { Editor } from '@tiptap/react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

interface LinkDialogProps {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}

export function LinkDialog({ editor, open, onClose }: LinkDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      {/* 開くたびに初期値を取り直すため、中身を別コンポーネントにしてマウントし直す */}
      {open && <LinkForm editor={editor} onClose={onClose} />}
    </Dialog>
  );
}

function LinkForm({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const isActive = editor.isActive('link');
  const { from, to, empty } = editor.state.selection;
  const [href, setHref] = useState<string>(() => (editor.getAttributes('link').href as string) ?? '');
  const [text, setText] = useState('');
  const needsText = empty && !isActive;

  const close = () => {
    onClose();
    editor.commands.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(href);
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (needsText) {
      const label = text.trim() || url;
      editor
        .chain()
        .focus()
        .insertContentAt(from, { type: 'text', text: label, marks: [{ type: 'link', attrs: { href: url } }] })
        .run();
    } else {
      editor.chain().focus().setTextSelection({ from, to }).extendMarkRange('link').setLink({ href: url }).run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  return (
    <form onSubmit={submit}>
      <DialogTitle>{isActive ? 'リンクを編集' : 'リンクを挿入'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            label="URL"
            placeholder="https://example.com"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            fullWidth
            type="url"
            inputMode="url"
          />
          {needsText && (
            <TextField
              label="表示テキスト（省略可）"
              value={text}
              onChange={(e) => setText(e.target.value)}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isActive && (
          <Button color="error" onClick={remove} sx={{ mr: 'auto' }}>
            リンクを解除
          </Button>
        )}
        <Button onClick={close}>キャンセル</Button>
        <Button type="submit" variant="contained" disableElevation>
          OK
        </Button>
      </DialogActions>
    </form>
  );
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('#') || v.startsWith('/')) return v;
  return `https://${v}`;
}
