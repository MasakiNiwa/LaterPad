import { useEditorState, type Editor } from '@tiptap/react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { modKey } from '../lib/platform';

export function UndoRedoButtons({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ canUndo: !!e?.can().undo(), canRedo: !!e?.can().redo() }),
  });
  const mod = modKey();
  const run = (fn: 'undo' | 'redo') => editor?.chain().focus()[fn]().run();

  return (
    <>
      <Tooltip title={`元に戻す（${mod}+Z）`}>
        <span>
          <IconButton aria-label="元に戻す" disabled={!state?.canUndo} onClick={() => run('undo')} onMouseDown={(e) => e.preventDefault()}>
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={`やり直す（${mod}+Shift+Z）`}>
        <span>
          <IconButton aria-label="やり直す" disabled={!state?.canRedo} onClick={() => run('redo')} onMouseDown={(e) => e.preventDefault()}>
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
