import { courses, getExercise } from "@fmc/curriculum";
import { ImageResponse } from "next/og";
import { logoDataUri, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { plainText } from "@/lib/site";

export const alt = "A free lesson from Free Math Camp";
export const size = OG_SIZE;
export const contentType = "image/png";

// One image per lesson, rendered at build time.
export const generateStaticParams = () =>
  courses.flatMap((c) => c.units.flatMap((u) => u.exercises.map((e) => ({ courseId: c.id, exerciseId: e.id }))));

export default async function Image({ params }: { params: Promise<{ courseId: string; exerciseId: string }> }) {
  const { courseId, exerciseId } = await params;
  const ref = getExercise(courseId, exerciseId);
  const logo = await logoDataUri();
  const title = ref?.exercise.title ?? "Free Math Camp";
  return new ImageResponse(
    (
      <OgFrame
        logo={logo}
        footer="Free lesson · interactive visuals · adaptive practice"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ref && (
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#a99cff" }}>
              {ref.course.title} · {ref.unit.title}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: title.length > 28 ? 80 : 100, lineHeight: 1.02, letterSpacing: -1.5 }}>{title}</div>
          {ref && <div style={{ display: "flex", fontSize: 32, color: "#cfcbe6", maxWidth: 1000 }}>{plainText(ref.exercise.summary).replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=")}</div>}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
