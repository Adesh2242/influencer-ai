import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Score";
import { AGE_BAND_LABELS, AGE_BANDS, CITY_TIER_LABELS, CITY_TIER_LIST, getCity, GENDER_LABELS, LANGUAGES, REGION_LIST, REGIONS } from "@/data/taxonomy";
import { formatShare } from "@/lib/format";
import type { Creator } from "@/types";

interface ShareRow {
  key: string;
  label: string;
  share: number;
}

function ShareGroup({ title, rows, note }: { title: string; rows: ShareRow[]; note?: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <Meter value={row.share * 100} label={row.label} valueLabel={formatShare(row.share)} tone="brand" />
          </li>
        ))}
      </ul>
      {note ? <p className="text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

export function AudienceSection({ creator }: { creator: Creator }) {
  const { audience } = creator;
  const knownGender = audience.gender.female + audience.gender.male;

  const groups: { title: string; rows: ShareRow[]; note?: ReactNode }[] = [
    {
      title: "Gender",
      rows: (["female", "male"] as const).map((gender) => ({ key: gender, label: GENDER_LABELS[gender], share: audience.gender[gender] })),
      note: knownGender < 0.995 ? `${formatShare(1 - knownGender)} other or not disclosed.` : undefined,
    },
    {
      title: "Age",
      rows: AGE_BANDS.map((band) => ({ key: band, label: AGE_BAND_LABELS[band], share: audience.age[band] })),
    },
    {
      title: "City tier",
      rows: CITY_TIER_LIST.map((tier) => ({ key: String(tier), label: CITY_TIER_LABELS[tier], share: audience.tiers[tier] })),
    },
    {
      title: "Region",
      rows: REGION_LIST.map((region) => ({ key: region, label: REGIONS[region].label, share: audience.regions[region] }))
        .filter((row) => row.share > 0)
        .sort((a, b) => b.share - a.share),
    },
    {
      title: "Top cities",
      rows: audience.topCities.map(({ cityId, share }) => ({ key: cityId, label: getCity(cityId)?.name ?? "Other city", share })),
    },
    {
      title: "Audience languages",
      rows: audience.languages.map(({ code, share }) => ({ key: code, label: LANGUAGES[code].label, share })),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">Audience</h2>
        <CardDescription>Estimated make-up of the audience across platforms.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <ShareGroup key={group.title} {...group} />
        ))}
      </CardContent>
    </Card>
  );
}
