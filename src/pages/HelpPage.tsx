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
    ['検索 / 置換', `${mod} + F / ${mod} + H`],
    ['次を検索 / 前を検索', 'Enter / Shift + Enter'],
    ['本文に戻す', `${mod} + Alt + 0`],
    ['太字 / 斜体', `${mod} + B / ${mod} + I`],
    ['取り消し線', `${mod} + Shift + S`],
    ['見出し 1〜3', `${mod} + Alt + 1〜3`],
    ['箇条書き / 番号付きリスト', `${mod} + Shift + 8 / 7`],
    ['リストの字下げ / 戻す', 'Tab / Shift + Tab'],
    ['チェックリスト', `${mod} + Shift + 9`],
    ['行内の改行（リストの項目内など）', 'Shift + Enter'],
    ['意味ブロックの中身を全選択', `${mod} + A`],
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

      <Section title="AI書式（意味ブロック）">
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            ツールバー左端の「AI書式」から、段落を役割の付いたブロックにできます。
            コピーすると各ブロックが XML タグで区切られ、AI が「何をしてほしいのか」「何が資料なのか」を取り違えにくくなります。
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', '& li': { mb: 0.5 } }}>
            <li><Typography variant="body2"><b>指示</b> … AI にしてほしいこと</Typography></li>
            <li><Typography variant="body2"><b>背景</b> … 前提・目的・状況</Typography></li>
            <li><Typography variant="body2"><b>条件</b> … 守ってほしいルール・制約</Typography></li>
            <li><Typography variant="body2"><b>資料</b> … 処理してほしい文章やデータ（指示としては扱われません）</Typography></li>
            <li><Typography variant="body2"><b>出力形式</b> … 回答の形・長さ・書き方</Typography></li>
            <li><Typography variant="body2"><b>例</b> … 入力と出力の見本</Typography></li>
            <li><Typography variant="body2"><b>メモ</b> … 自分用のメモ（AI には送られません）</Typography></li>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            「テンプレートから始める」で、よく使うブロックの組み合わせをまとめて挿入できます。空のブロックには書き方の例が表示されます。
            ブロック上部のラベルから種類の変更・名前付け（例：資料「議事録」）・解除ができます。
            ブロック内の最後の空行で Enter を押すとブロックの外に出ます。ブロックの中でさらに「AI書式」を選ぶと入れ子にできます。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ブロックのラベルのメニューから、上へ／下へ移動・中身を選択・中身をコピー・中身をすべて削除・ブロックを削除ができます。
            ラベル左のつまみ（⋮⋮）を押したまま上下に動かすと並べ替えられます（スマホでも使えます。同じ階層の中で移動します）。
            ブロック内で {mod}+A を押すとブロックの中身だけを選択し、もう一度押すと全体を選択します。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            「AI書式」メニューの<b>重要度</b>で、選択した文字（選択がなければカーソルのある行）に「必須」「推奨」を付けられます。
            コピーすると【必須】【推奨】として AI に伝わります。
          </Typography>
        </Box>
      </Section>

      <Section title="AI書式の書き方のコツ">
        <Box component="ul" sx={{ m: 0, py: 2, pr: 2, pl: 4.5, color: 'text.secondary', '& li': { mb: 1 } }}>
          <li>
            <Typography variant="body2">
              ブロックは基本的に<b>横に並べる（入れ子にしない）</b>のがおすすめです。「背景 → 指示 → 条件 → 資料 → 出力形式」の順に並べると、AI が読みやすくなります。
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              背景の中に指示を入れたくなったときは、その背景の<b>すぐ後ろに指示ブロックを置く</b>か、指示ブロックの中に「〇〇なので、△△してください」と理由ごと書くと伝わりやすくなります。
              特定の資料にだけ関係する指示は、その資料の中に入れ子にするのも有効です。
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              指示が複数あるときは、1 つの指示ブロックの中で<b>番号付きリスト</b>にすると、順番や抜け漏れが伝わりやすくなります。
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              全部をブロックにする必要はありません。あいさつや補足はブロックの外に普通に書いてかまいません。
            </Typography>
          </li>
        </Box>
      </Section>

      <Section title="使い方">
        <Box component="ol" sx={{ m: 0, py: 2, pr: 2, pl: 5, '& li': { mb: 1 } }}>
          <li>
            <Typography>
              文章を書きます。書式はツールバーの「AI書式」「段落」「文字」「リスト」「挿入」から選べます。
              スマホではグループを押すと、そのグループの機能が下に一列で並び、続けて 1 タップで使えます（もう一度押すと閉じます）。
              表の中にカーソルがあるときは「表」が現れ、行・列の追加や削除、セルの結合ができます。
            </Typography>
          </li>
          <li>
            <Typography>
              上部の「AI用にコピー」を押します。
            </Typography>
          </li>
          <li>
            <Typography>AI のチャット欄に貼り付けます。</Typography>
          </li>
        </Box>
        <Divider />
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          慣れてきたら、設定の「ボタンの文字を省略する（圧縮表示）」で上部の表示を小さくできます。
          「プレビュー」（スマホでは下部の「プレビュー」やコピー後のお知らせの「内容を見る」）で、コピーされる内容を確認できます。書いた内容はこのブラウザに自動で一時保存され、次に起動したときは空の文書で始まります（起動直後の「復元」で前回の内容に戻せます）。
        </Typography>
      </Section>

      <Section title="検索と置換">
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          上部の「検索」で検索バーが開きます。一致した箇所がハイライトされ、矢印ボタンか Enter で移動できます。
          「Aa」で大文字・小文字を区別、置換ボタンで置換欄が開き「置換」「すべて置換」ができます。置換は「戻す」で取り消せます。
        </Typography>
      </Section>

      <Section title="文書の保存">
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          1 つの文書を 1 つのファイル（.laterpad）として保存します。上部の「新規」「開く」「保存」「別名保存」ボタンを使うか、
          ファイルを画面にドラッグ＆ドロップして開けます。PC の Chrome / Edge では同じファイルへ上書き保存でき、
          それ以外のブラウザではダウンロードとして保存されます。上部のタイトル欄の文字がファイル名に使われます。
        </Typography>
      </Section>

      <Section title="履歴（リビジョン）">
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          時計のアイコンから、この文書の過去の状態を確認できます。「AI用にコピー」した時点（プロンプトを AI に渡した時点）と
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
