import type { ReactNode } from 'react';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import OutputOutlinedIcon from '@mui/icons-material/OutputOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import type { AiBlockRole } from '../../core/aiBlocks';

/** 意味ブロックの役割ごとのアイコンと色（ライト / ダーク） */
export const ROLE_STYLE: Record<AiBlockRole, { icon: (size?: 'small' | 'inherit') => ReactNode; light: string; dark: string }> = {
  instruction: { icon: (s = 'small') => <CampaignOutlinedIcon fontSize={s} />, light: '#3b5bdb', dark: '#9fb4ff' },
  context: { icon: (s = 'small') => <InfoOutlinedIcon fontSize={s} />, light: '#0b7285', dark: '#7ad3e3' },
  constraint: { icon: (s = 'small') => <RuleOutlinedIcon fontSize={s} />, light: '#c2410c', dark: '#ffb38a' },
  material: { icon: (s = 'small') => <ArticleOutlinedIcon fontSize={s} />, light: '#6b4fa3', dark: '#cdb8ff' },
  output: { icon: (s = 'small') => <OutputOutlinedIcon fontSize={s} />, light: '#2b8a3e', dark: '#8ce99a' },
  example: { icon: (s = 'small') => <LightbulbOutlinedIcon fontSize={s} />, light: '#a15c00', dark: '#ffd43b' },
  note: { icon: (s = 'small') => <StickyNote2OutlinedIcon fontSize={s} />, light: '#6c6c78', dark: '#a8a8b3' },
};
