import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Radio from '@mui/material/Radio';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import BrightnessAutoOutlinedIcon from '@mui/icons-material/BrightnessAutoOutlined';
import { Section, SubPageLayout } from '../components/SubPageLayout';
import { exporters, RECOMMENDED, resolveExporter } from '../core/export';
import { useSettings } from '../settings/SettingsContext';
import type { FontSize, ThemeMode } from '../settings/settings';

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const recommended = resolveExporter(RECOMMENDED);

  const formatOptions = [
    {
      id: RECOMMENDED,
      label: `推奨形式（現在は ${recommended.label}）`,
      description: 'LaterPad がその時点で最適と考える形式でコピーします。通常はこれを選んでください。',
    },
    ...exporters.map((e) => ({ id: e.id, label: e.label, description: e.description })),
  ];

  return (
    <SubPageLayout title="設定">
      <Section title="表示">
        <Row label="テーマ">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={settings.themeMode}
            onChange={(_, v: ThemeMode | null) => v && updateSettings({ themeMode: v })}
            aria-label="テーマ"
          >
            <ToggleButton value="system" aria-label="システム設定に従う">
              <BrightnessAutoOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              自動
            </ToggleButton>
            <ToggleButton value="light" aria-label="ライト">
              <LightModeOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              ライト
            </ToggleButton>
            <ToggleButton value="dark" aria-label="ダーク">
              <DarkModeOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              ダーク
            </ToggleButton>
          </ToggleButtonGroup>
        </Row>
        <Divider />
        <Row label="文字サイズ">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={settings.fontSize}
            onChange={(_, v: FontSize | null) => v && updateSettings({ fontSize: v })}
            aria-label="文字サイズ"
          >
            <ToggleButton value="small">小</ToggleButton>
            <ToggleButton value="medium">中</ToggleButton>
            <ToggleButton value="large">大</ToggleButton>
          </ToggleButtonGroup>
        </Row>
      </Section>

      <Section title="AI用コピーの形式">
        {formatOptions.map((o, i) => (
          <Box key={o.id}>
            {i > 0 && <Divider />}
            <Box
              component="label"
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: 1, py: 1.5, cursor: 'pointer' }}
            >
              <Radio
                checked={settings.copyFormat === o.id}
                onChange={() => updateSettings({ copyFormat: o.id })}
                value={o.id}
                name="copy-format"
                sx={{ mt: -0.75 }}
              />
              <Box>
                <Typography sx={{ fontWeight: 500 }}>{o.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {o.description}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Section>

      <Section title="履歴">
        <Box
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>AI用にコピーした時点を記録する</Typography>
            <Typography variant="body2" color="text.secondary">
              コピーするたびに、その時点の内容を履歴に残します（直前と同じ内容なら記録しません）。
            </Typography>
          </Box>
          <Switch
            checked={settings.revisionOnCopy}
            onChange={(e) => updateSettings({ revisionOnCopy: e.target.checked })}
          />
        </Box>
      </Section>

      <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
        設定はこのブラウザ内に保存されます。
      </Typography>
    </SubPageLayout>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        px: 2,
        py: 1.5,
      }}
    >
      <Typography sx={{ fontWeight: 500 }}>{label}</Typography>
      {children}
    </Box>
  );
}
