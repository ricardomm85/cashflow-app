const SVG_NS = 'http://www.w3.org/2000/svg';

type PathSpec = { tag: 'path'; d: string }
  | { tag: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { tag: 'circle'; cx: number; cy: number; r: number };

function svg(parts: PathSpec[]): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('viewBox', '0 0 24 24');
  root.setAttribute('fill', 'none');
  root.setAttribute('stroke', 'currentColor');
  root.setAttribute('stroke-width', '1.75');
  root.setAttribute('stroke-linecap', 'round');
  root.setAttribute('stroke-linejoin', 'round');
  for (const p of parts) {
    if (p.tag === 'path') {
      const el = document.createElementNS(SVG_NS, 'path');
      el.setAttribute('d', p.d);
      root.appendChild(el);
    } else if (p.tag === 'rect') {
      const el = document.createElementNS(SVG_NS, 'rect');
      el.setAttribute('x', String(p.x));
      el.setAttribute('y', String(p.y));
      el.setAttribute('width', String(p.w));
      el.setAttribute('height', String(p.h));
      if (p.rx !== undefined) el.setAttribute('rx', String(p.rx));
      root.appendChild(el);
    } else {
      const el = document.createElementNS(SVG_NS, 'circle');
      el.setAttribute('cx', String(p.cx));
      el.setAttribute('cy', String(p.cy));
      el.setAttribute('r', String(p.r));
      root.appendChild(el);
    }
  }
  return root;
}

const p = (d: string): PathSpec => ({ tag: 'path', d });
const r = (x: number, y: number, w: number, h: number, rx = 1.5): PathSpec => ({ tag: 'rect', x, y, w, h, rx });
const c = (cx: number, cy: number, radius: number): PathSpec => ({ tag: 'circle', cx, cy, r: radius });

export const icons = {
  dashboard: () => svg([r(3, 3, 7, 9), r(14, 3, 7, 5), r(14, 12, 7, 9), r(3, 16, 7, 5)]),
  transactions: () => svg([p('M3 7h18M3 12h18M3 17h12')]),
  categories: () => svg([r(3, 3, 7, 7), r(14, 3, 7, 7), r(3, 14, 7, 7), r(14, 14, 7, 7)]),
  bank: () => svg([p('M3 21h18M4 10h16M5 21V10M19 21V10M9 21v-7M15 21v-7M12 3 3 8h18l-9-5Z')]),
  currency: () => svg([c(12, 12, 9), p('M15 9.5c-.5-1-1.5-1.5-3-1.5-2 0-3 1-3 2 0 3 6 1 6 4 0 1-1 2-3 2-1.5 0-2.5-.5-3-1.5M12 6v2M12 16v2')]),
  config: () => svg([
    c(12, 12, 3),
    p('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'),
  ]),
  logout: () => svg([p('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9')]),
  external: () => svg([p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3')]),
  plus: () => svg([p('M12 5v14M5 12h14')]),
  trash: () => svg([p('M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6')]),
  edit: () => svg([p('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z')]),
  chevron: () => svg([p('M6 9l6 6 6-6')]),
  filter: () => svg([p('M3 5h18M6 12h12M10 19h4')]),
};
