export function Sparkline({
  values,
  width = 72,
  height = 22,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`)
    .join(" ");
  const areaPath = `M0,${height} L${points.replace(/ /g, " L")} L${width},${height} Z`;
  const linePath = `M${points.replace(/ /g, " L")}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <path d={areaPath} fill="currentColor" opacity={0.15} />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}