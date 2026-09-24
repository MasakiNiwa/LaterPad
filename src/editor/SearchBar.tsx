import { useEffect, useRef, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import SearchIcon from '@mui/icons-material/Search';
import type { Theme } from '@mui/material/styles';
import { getSearchState } from './search';

interface SearchBarProps {
  editor: Editor;
  /** 置換欄を開いた状態で表示するか */
  replaceOpen: boolean;
  onToggleReplace: () => void;
  onClose: () => void;
  /** すべて置換した件数を通知する */
  onReplacedAll?: (count: number) => void;
  /** 開くたびに増える値（検索欄へフォーカスし直すため） */
  focusKey: number;
}

/** 検索・置換バー */
export function SearchBar({ editor, replaceOpen, onToggleReplace, onClose, onReplacedAll, focusKey }: SearchBarProps) {
  const search = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = getSearchState(e.state);
      return { term: s?.term ?? '', caseSensitive: !!s?.caseSensitive, count: s?.matches.length ?? 0, current: s?.current ?? -1 };
    },
  });
  const [replacement, setReplacement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusKey]);

  // 閉じたらハイライトを消す
  useEffect(() => () => void editor.commands.clearSearch(), [editor]);

  const reveal = () =>
    requestAnimationFrame(() => {
      editor.view.dom.querySelector('.search-match-current')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  const next = () => editor.commands.searchNext() && reveal();
  const prev = () => editor.commands.searchPrev() && reveal();

  if (!search) return null;
  const has = search.count > 0;
  const counter = search.term ? (has ? `${search.current + 1} / ${search.count}` : '0 件') : '';

  const field = (t: Theme) => ({
    flex: 1,
    minWidth: 0,
    height: 40,
    px: 1.5,
    borderRadius: '20px',
    bgcolor: t.m3.surfaceContainerHigh,
    fontSize: 16,
  });

  return (
    <Box
      role="search"
      sx={(t) => ({ px: { xs: 1, sm: 2 }, py: 1, display: 'grid', gap: 1, borderTop: `1px solid ${t.m3.outlineVariant}`, maxWidth: 900, mx: 'auto', width: '100%' })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <InputBase
          inputRef={inputRef}
          value={search.term}
          onChange={(e) => {
            editor.commands.setSearch({ term: e.target.value });
            reveal();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (e.shiftKey) prev();
              else next();
            } else if (e.key === 'Escape') onClose();
          }}
          placeholder="検索"
          startAdornment={<SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
          endAdornment={
            <Typography variant="caption" color={search.term && !has ? 'error' : 'text.secondary'} sx={{ whiteSpace: 'nowrap', ml: 1 }}>
              {counter}
            </Typography>
          }
          inputProps={{ 'aria-label': '検索する文字' }}
          sx={field}
        />
        <Tooltip title="大文字と小文字を区別">
          <IconButton
            aria-label="大文字と小文字を区別"
            aria-pressed={search.caseSensitive}
            onClick={() => editor.commands.setSearch({ caseSensitive: !search.caseSensitive })}
            sx={(t) => ({
              fontSize: 14,
              fontWeight: 700,
              width: 40,
              height: 40,
              color: search.caseSensitive ? t.m3.onPrimaryContainer : 'text.secondary',
              bgcolor: search.caseSensitive ? t.m3.primaryContainer : 'transparent',
            })}
          >
            Aa
          </IconButton>
        </Tooltip>
        <Tooltip title="前へ（Shift+Enter）">
          <span>
            <IconButton aria-label="前へ" disabled={!has} onClick={prev}>
              <KeyboardArrowUpIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="次へ（Enter）">
          <span>
            <IconButton aria-label="次へ" disabled={!has} onClick={next}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={replaceOpen ? '置換を閉じる' : '置換'}>
          <IconButton
            aria-label="置換"
            aria-pressed={replaceOpen}
            onClick={onToggleReplace}
            sx={(t) => ({ color: replaceOpen ? t.m3.onPrimaryContainer : undefined, bgcolor: replaceOpen ? t.m3.primaryContainer : undefined })}
          >
            <FindReplaceIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="閉じる（Esc）">
          <IconButton aria-label="検索を閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {replaceOpen && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <InputBase
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (editor.commands.replaceCurrent(replacement)) reveal();
              } else if (e.key === 'Escape') onClose();
            }}
            placeholder="置換後の文字"
            inputProps={{ 'aria-label': '置換後の文字' }}
            sx={(t) => ({ ...field(t), flexBasis: { xs: '100%', sm: 'auto' } })}
          />
          <Button variant="outlined" disabled={!has} onClick={() => editor.commands.replaceCurrent(replacement) && reveal()} sx={{ flexShrink: 0, flex: { xs: 1, sm: 'none' } }}>
            置換
          </Button>
          <Button variant="contained" disableElevation disabled={!has} onClick={() => {
              const count = search.count;
              if (editor.commands.replaceAll(replacement)) onReplacedAll?.(count);
            }} sx={{ flexShrink: 0, flex: { xs: 1, sm: 'none' } }}>
            すべて置換
          </Button>
        </Box>
      )}
    </Box>
  );
}
