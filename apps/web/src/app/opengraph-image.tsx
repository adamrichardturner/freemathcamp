import { ImageResponse } from "next/og";
import { course, graph } from "@/lib/course";
import { logoDataUri, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Free Math Camp — all the maths you need before calculus, free";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const logo = await logoDataUri();
  return new ImageResponse(
    (
      <OgFrame
        logo={logo}
        footer={`${graph.refs.length} free lessons · ${course.units.length} units · adaptive practice`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>Free Math Camp</div>
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 54, lineHeight: 1.1, color: "#d8d4f5" }}>
            All the maths you need&nbsp;<span style={{ fontStyle: "italic", color: "#f0a3bc" }}>before</span>&nbsp;calculus.
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
