import { useTheme } from '@mui/material/styles';
import type { GraphRow } from '../../core/revisions';

export const LANE_WIDTH = 14;
/** 丸の中心の高さ（行の上端から） */
export const NODE_Y = 22;

const LANE_COLORS_LIGHT = ['#4355b9', '#2b8a3e', '#c2410c', '#6b4fa3', '#0b7285', '#a15c00'];
const LANE_COLORS_DARK = ['#bac3ff', '#8ce99a', '#ffb38a', '#cdb8ff', '#7ad3e3', '#ffd43b'];

/**
 * 履歴一覧の 1 行分の枝の線と丸。
 * 行の高さは中身によって変わるため、縦線は 100% の高さで描く。
 */
export function RevisionGraphCell({ row, laneCount, isHead }: { row: GraphRow; laneCount: number; isHead: boolean }) {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? LANE_COLORS_DARK : LANE_COLORS_LIGHT;
  const color = (lane: number) => colors[lane % colors.length];
  const x = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2;
  const width = Math.max(1, laneCount) * LANE_WIDTH;
  const lanes = Math.max(row.lanesAbove.length, row.lanesBelow.length);
  const lines = [];
  for (let i = 0; i < lanes; i++) {
    const above = row.lanesAbove[i] != null;
    const below = row.lanesBelow[i] != null;
    if (i === row.lane) {
      if (above) lines.push(<line key={`a${i}`} x1={x(i)} y1={0} x2={x(i)} y2={NODE_Y} stroke={color(i)} strokeWidth={2} />);
      if (below) lines.push(<line key={`b${i}`} x1={x(i)} y1={NODE_Y} x2={x(i)} y2="100%" stroke={color(i)} strokeWidth={2} />);
    } else if (row.mergingFrom.includes(i)) {
      // 分岐した枝がこの版（分岐点）に合流する
      lines.push(
        <path
          key={`m${i}`}
          d={`M ${x(i)} 0 C ${x(i)} ${NODE_Y * 0.7}, ${x(row.lane)} ${NODE_Y * 0.4}, ${x(row.lane)} ${NODE_Y}`}
          fill="none"
          stroke={color(i)}
          strokeWidth={2}
        />,
      );
    } else if (above || below) {
      lines.push(<line key={`p${i}`} x1={x(i)} y1={above ? 0 : NODE_Y} x2={x(i)} y2="100%" stroke={color(i)} strokeWidth={2} />);
    }
  }
  const c = color(row.lane);
  // 行の高さに合わせて線を伸ばすため、行いっぱいに広げた枠の中に絶対配置で描く
  return (
    <span style={{ position: 'relative', display: 'block', width, flexShrink: 0, alignSelf: 'stretch' }} aria-hidden>
    <svg width={width} height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', display: 'block' }}>
      {lines}
      {isHead ? (
        <>
          <circle cx={x(row.lane)} cy={NODE_Y} r={7} fill={theme.palette.background.default} stroke={c} strokeWidth={2} />
          <circle cx={x(row.lane)} cy={NODE_Y} r={3.5} fill={c} />
        </>
      ) : (
        <circle cx={x(row.lane)} cy={NODE_Y} r={5} fill={c} stroke={theme.palette.background.default} strokeWidth={2} />
      )}
    </svg>
    </span>
  );
}
