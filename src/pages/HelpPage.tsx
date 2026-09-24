import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Logo } from '../components/Brand';
import { Section, SubPageLayout } from '../components/SubPageLayout';
import { APP_NAME, APP_TAGLINE, APP_VERSION, BUILD_DATE, REPOSITORY_URL } from '../appInfo';
import { modKey } from '../lib/platform';

export function HelpPage() {
  const mod = modKey();
  const shortcuts: [string, string][] = [
    ['AI用にコピー', `${mod} + Shift + Enter`],
    ['保存 / 開く', `${mod} + S / ${mod} + O`],
    ['本文に戻す', `${mod} + Alt + 0`],
    ['太字 / 斜体', `${mod} + B / ${mod} + I`],
    ['取り消し線', `${mod} + Shift + S`],
    ['見出し 1〜3', `${mod} + Alt + 1〜3`],
    ['箇条書き / 番号付きリスト', `${mod} + Shift + 8 / 7`],
    ['リストの字下げ / 戻す', 'Tab / Shift + Tab'],
    ['表の次のセル / 前のセル', 'Tab / Shift + Tab'],
    ['引用', `${mod} + Shift + B`],
    ['インラインコード / コードブロック', `${mod} + E / ${mod} + Alt + C`],
    ['リンク', `${mod} + K`],
    ['元に戻す / やり直す', `${mod} + Z / ${mod} + Shift + Z`],
  ];
  const markdownInputs: [string, string][] = [
    ['# + スペース', '見出し 1（## で見出し 2 …）'],
    ['- + スペース', '箇条書き'],
    ['1. + スペース', '番号付きリスト'],
    ['> + スペース', '引用'],
    ['``` + Enter', 'コードブロック'],
    ['**文字**', '太字'],
  ];

  return (
    <SubPageLayout title="ヘルプ">
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Box sx={{ display: 'inline-block', mb: 1.5 }}>
          <Logo size={56} />
        </Box>
        <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
          {APP_NAME}
        </Typography>
        <Typography color="text.secondary">{APP_TAGLINE}</Typography>
      </Box>

      <Section title="LaterPad とは">
        <Box sx={{ p: 2 }}>
          <Typography sx={{ mb: 1 }}>
            普通に書く。AI に伝わる形でコピーする。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            記法を意識せず、見出し・太字・リスト・表などを使って直感的に文章を書き、
            「AI用にコピー」で ChatGPT や Claude などの AI が理解しやすいテキスト形式に変換してコピーできます。
            書式を使わなければ、シンプルなテキストエディタとしてそのまま使えます。
          </Typography>
        </Box>
      </Section>

      <Section title="使い方">
        <Box component="ol" sx={{ m: 0, py: 2, pr: 2, pl: 5, '& li': { mb: 1 } }}>
          <li>
            <Typography>
              文章を書きます。書式はツールバーの「段落」「文字」「リスト」「挿入」から選べます。
              表の中にカーソルがあるときは「表」が現れ、行・列の追加や削除、セルの結合ができます。
            </Typography>
          </li>
          <li>
            <Typography>
              右上（スマホでは右下）の「AI用にコピー」を押します。
            </Typography>
          </li>
          <li>
            <Typography>AI のチャット欄に貼り付けます。</Typography>
          </li>
        </Box>
        <Divider />
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          目のアイコンで、コピーされる内容を事前に確認できます。書いた内容はこのブラウザに自動で一時保存されます。
        </Typography>
      </Section>

      <Section title="文書の保存">
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          1 つの文書を 1 つのファイル（.laterpad）として保存します。上部の「ファイル」メニューの「保存」「開く…」を使うか、
          ファイルを画面にドラッグ＆ドロップして開けます。PC の Chrome / Edge では同じファイルへ上書き保存でき、
          それ以外のブラウザではダウンロードとして保存されます。タイトルはファイル名に使われます。
        </Typography>
      </Section>

      <Section title="履歴（リビジョン）">
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          時計のアイコンから、この文書の過去の状態を確認できます。「AI用にコピー」した時点・ファイルに保存した時点・
          復元する前の状態が自動で記録され、「今の状態を記録」で手動でも残せます。各履歴は現在や前の版との差分を表示でき、
          「この版に戻す」で復元、「この版をコピー」でその時点の内容を AI 用にコピーできます。履歴は文書ファイルに一緒に保存されます。
        </Typography>
      </Section>

      <Section title="キーボードショートカット">
        <KeyTable rows={shortcuts} />
      </Section>

      <Section title="入力の近道">
        <KeyTable rows={markdownInputs} />
      </Section>

      <Section title="バージョン情報">
        <InfoRow label="バージョン">{APP_VERSION}</InfoRow>
        <Divider />
        <InfoRow label="ビルド日">{BUILD_DATE}</InfoRow>
        <Divider />
        <Link
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}
        >
          <GitHubIcon />
          <Typography sx={{ flex: 1, fontWeight: 500 }}>GitHub リポジトリ</Typography>
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Section>
    </SubPageLayout>
  );
}

function KeyTable({ rows }: { rows: [string, string][] }) {
  return (
    <Box>
      {rows.map(([k, v], i) => (
        <Box key={k}>
          {i > 0 && <Divider />}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 2, py: 1.25 }}>
            <Typography variant="body2">{k}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', textAlign: 'right' }}
            >
              {v}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1.5 }}>
      <Typography>{label}</Typography>
      <Typography color="text.secondary">{children}</Typography>
    </Box>
  );
}
