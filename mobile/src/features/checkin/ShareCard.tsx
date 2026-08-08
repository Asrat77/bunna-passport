import { View } from "react-native";
import { BilingualName } from "@/design/components/BilingualName";
import { BunnaMark } from "@/design/components/BunnaMark";
import { Seal, type StampLevel } from "@/design/components/Seal";
import { Text } from "@/design/components/Text";
import { palettes, radius, space } from "@/design/tokens";

/** Instagram and WhatsApp both show 4:5 without cropping. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export type ShareCardProps = {
  name: string;
  nameAm: string;
  level: StampLevel;
  /**
   * Which stamp this is in the collection, when that is known. Only the
   * ceremony knows it for certain — a card made later would be guessing.
   */
  ordinal?: number;
  earnedAt: Date;
};

/**
 * The picture of a stamp, for sending to someone who is not here.
 *
 * Deliberately says nothing about where the person is beyond the city. A card
 * announces a coffee; it must not double as a record of somebody's movements,
 * so no coordinates, no neighbourhood, and no handle.
 *
 * Always drawn from the light palette. A card is one artifact whoever made it,
 * and should not arrive looking different because of a phone setting.
 *
 * If capture comes back blank on a device, the cause is almost certainly the
 * SVG seal rather than the layout: swap `Seal` for a plain View circle with the
 * initials as Text and try again before changing anything else.
 */
export function ShareCard({ name, nameAm, level, ordinal, earnedAt }: ShareCardProps) {
  const colors = palettes.light;
  const date = earnedAt.toISOString().slice(0, 10);
  const banner = ordinal
    ? `Stamp №${ordinal} · Addis Ababa`
    : `${level[0].toUpperCase()}${level.slice(1)} stamp · Addis Ababa`;

  return (
    <View
      // Android drops views it thinks are decorative, and captures them blank.
      collapsable={false}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        padding: 96,
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        backgroundColor: colors.surface,
      }}
    >
      <View
        collapsable={false}
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          borderRadius: 310,
          top: -180,
          right: -200,
          backgroundColor: colors.accentSoft,
          opacity: 0.85,
        }}
      />

      <View style={{ transform: [{ scale: 2.6 }], marginVertical: 120 }} collapsable={false}>
        <Seal name={name} nameAm={nameAm} level={level} size="lg" />
      </View>

      <View style={{ alignItems: "center", gap: space.md }}>
        <BilingualName name={name} nameAm={nameAm} role="display" secondaryRole="heading" />
        <View
          style={{
            paddingHorizontal: 40,
            paddingVertical: 16,
            borderRadius: radius.full,
            backgroundColor: colors.primarySoft,
          }}
        >
          <Text role="heading" color="primary" weight="bold">
            {banner}
          </Text>
        </View>
        <Text role="body" color="inkMuted">
          {date}
        </Text>
      </View>

      <View style={{ position: "absolute", bottom: 72, alignItems: "center", gap: space.sm }}>
        <BunnaMark size={72} />
        <Text role="label" color="inkFaint" weight="medium">
          Bunna Passport
        </Text>
      </View>
    </View>
  );
}
