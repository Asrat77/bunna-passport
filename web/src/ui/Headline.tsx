/**
 * The two-tone headline on every main screen: two lines, the second in
 * primary ("Where's your / first cup?"). `oneLine` sets both halves on one
 * line, as Explore does.
 */
export function Headline({
  first,
  second,
  size = 34,
  align = "left",
  as: Tag = "h1",
  oneLine = false,
}: {
  first: string;
  second: string;
  size?: number;
  align?: "left" | "center";
  as?: "h1" | "h2";
  oneLine?: boolean;
}) {
  return (
    <Tag className={oneLine ? "headline headline--one-line" : "headline"} style={{ fontSize: size, textAlign: align }}>
      {first}
      {oneLine ? " " : <br />}
      <span className="headline__second">{second}</span>
    </Tag>
  );
}
