import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/api/client";
import type { Review, ReviewSummary } from "@/api/types";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { radius, space } from "@/design/tokens";
import { useI18n } from "@/i18n/context";

function Stars({ rating }: { rating: number }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((position) => (
        <MaterialCommunityIcons
          key={position}
          name={position <= rating ? "star" : "star-outline"}
          size={14}
          color={position <= rating ? colors.accent : colors.borderStrong}
        />
      ))}
    </View>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={{
        gap: space.xs,
        padding: space.md,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Text role="label" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {review.user.display_name}
        </Text>
        {review.rating ? (
          <Stars rating={review.rating} />
        ) : (
          <Text role="caption" color="inkFaint">
            {t("reviews.unrated")}
          </Text>
        )}
      </View>
      {review.note ? <Text role="body">{review.note}</Text> : null}
      {review.drink ? (
        <Text role="caption" color="inkMuted">
          {review.drink}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Reviews are not their own record — they are what someone chose to say on a
 * visit the server verified, so nobody can rate a shop they never stood in.
 */
export function ShopReviews({ shopId }: { shopId: number }) {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listReviews(shopId)
      .then((response) => {
        if (!active) return;
        setReviews(response.data);
        setSummary((response.meta as ReviewSummary | undefined) ?? null);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => {
      active = false;
    };
  }, [shopId]);

  // Say nothing until the answer is known, rather than flashing an empty state.
  if (reviews === null) return null;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text role="heading">{t("reviews.title")}</Text>
        {summary?.rating_average ? (
          <Text role="caption" color="inkMuted">
            {t("reviews.summary", {
              average: summary.rating_average.toFixed(1),
              count: summary.rating_count,
            })}
          </Text>
        ) : null}
      </View>

      {reviews.length === 0 ? (
        <Text role="caption" color="inkFaint">
          {t("reviews.empty")}
        </Text>
      ) : (
        <View style={{ gap: space.sm }}>
          {reviews.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </View>
      )}
    </View>
  );
}
