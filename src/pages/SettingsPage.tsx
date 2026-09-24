import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Radio from '@mui/material/Radio';
import Switch from '@mui/material/Switch';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import BrightnessAutoOutlinedIcon from '@mui/icons-material/BrightnessAutoOutlined';
import { Section, SubPageLayout } from '../components/SubPageLayout';
import { exporters, RECOMMENDED, resolveExporter } from '../core/export';
import { useSettings } from '../settings/SettingsContext';
import { DEFAULT_SETTINGS, FONT_SIZE_RANGE, LINE_HEIGHT_RANGE, type ThemeMode } from '../settings/settings';

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
        <SliderRow
          label="文字サイズ"
          value={settings.fontSize}
          display={`${settings.fontSize}px`}
          range={FONT_SIZE_RANGE}
          onChange={(v) => updateSettings({ fontSize: v })}
        />
        <SliderRow
          label="行間"
          value={settings.lineHeight}
          display={settings.lineHeight.toFixed(1)}
          range={LINE_HEIGHT_RANGE}
          onChange={(v) => updateSettings({ lineHeight: Math.round(v * 10) / 10 })}
        />
        <Box
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, cursor: 'pointer' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>余白を狭くする</Typography>
            <Typography variant="body2" color="text.secondary">
              本文の左右や見出しまわりの余白を詰めて、画面に多く表示します。
            </Typography>
          </Box>
          <Switch checked={settings.compact} onChange={(e) => updateSettings({ compact: e.target.checked })} />
        </Box>
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            プレビュー
          </Typography>
          <Box
            sx={(t) => ({
              mt: 0.5,
              p: 1.5,
              borderRadius: '12px',
              bgcolor: t.m3.surface,
              border: `1px solid ${t.m3.outlineVariant}`,
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
            })}
          >
            普通に書く。AI に伝わる形でコピーする。
            <br />
            LaterPad は書式をAIに渡すための専用エディタです。
          </Box>
          <Button size="small" sx={{ mt: 1 }} onClick={() => updateSettings({ fontSize: DEFAULT_SETTINGS.fontSize, lineHeight: DEFAULT_SETTINGS.lineHeight, compact: DEFAULT_SETTINGS.compact })}>
            標準に戻す
          </Button>
        </Box>
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

      <Section title="編集">
        <Box
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>リストの項目内で改行する</Typography>
            <Typography variant="body2" color="text.secondary">
              オンにすると、リストで Enter を押したときに同じ項目の中で改行します。空の行でもう一度 Enter を押すと新しい項目になります。
            </Typography>
          </Box>
          <Switch
            checked={settings.listEnterLineBreak}
            onChange={(e) => updateSettings({ listEnterLineBreak: e.target.checked })}
          />
        </Box>
      </Section>

      <Section title="起動時">
        <Box
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>前回の内容を開く</Typography>
            <Typography variant="body2" color="text.secondary">
              オフの場合は空の文書で始まります。前回の内容は起動直後に表示される「復元」から戻せます。
            </Typography>
          </Box>
          <Switch
            checked={settings.restoreOnStartup}
            onChange={(e) => updateSettings({ restoreOnStartup: e.target.checked })}
          />
        </Box>
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

function SliderRow({
  label,
  value,
  display,
  range,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  range: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  return (
    <Box sx={{ px: 2, pt: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 500 }}>{label}</Typography>
        <Typography color="text.secondary">{display}</Typography>
      </Box>
      <Slider
        value={value}
        min={range.min}
        max={range.max}
        step={range.step}
        onChange={(_, v) => onChange(v as number)}
        aria-label={label}
        size="small"
      />
    </Box>
  );
}
