/**
 * The two-tone headline on every main screen: two lines, the second in
 * primary ("Where's your / first cup?").
 */
export function Headline({
  first,
  second,
  size = 34,
  align = "left",
  as: Tag = "h1",
}: {
  first: string;
  second: string;
  size?: number;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  return (
    <Tag className="headline" style={{ fontSize: size, textAlign: align }}>
      {first}
      <br />
      <span className="headline__second">{second}</span>
    </Tag>
  );
}
