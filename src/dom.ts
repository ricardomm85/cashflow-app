type Props<K extends keyof HTMLElementTagNameMap> =
  Omit<Partial<HTMLElementTagNameMap[K]>, 'style' | 'className'> & {
    style?: string;
    className?: string;
  };

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props<K> = {} as Props<K>,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { style, className, ...rest } = props;
  if (style !== undefined) node.setAttribute('style', style);
  if (className !== undefined) node.className = className;
  Object.assign(node, rest);
  for (const c of children) node.append(c);
  return node;
}
