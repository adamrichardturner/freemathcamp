"use client";

import type { Visual as VisualSpec } from "@fmc/curriculum";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import * as A from "./animated-visuals";
import * as S from "./static-visuals";

// Mafs measures the DOM, so interactive graphs render on the client only.
const loading = () => <Skeleton className="h-[340px] w-full rounded-xl" />;
const I = {
  FunctionPlot: dynamic(() => import("./interactive-visuals").then((m) => m.FunctionPlot), { ssr: false, loading }),
  SlopeExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.SlopeExplorer), { ssr: false, loading }),
  LineExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.LineExplorer), { ssr: false, loading }),
  ParabolaExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.ParabolaExplorer), { ssr: false, loading }),
  TransformExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.TransformExplorer), { ssr: false, loading }),
  ExponentialExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.ExponentialExplorer), { ssr: false, loading }),
  UnitCircle: dynamic(() => import("./interactive-visuals").then((m) => m.UnitCircle), { ssr: false, loading }),
  SystemExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.SystemExplorer), { ssr: false, loading }),
  SecantExplorer: dynamic(() => import("./interactive-visuals").then((m) => m.SecantExplorer), { ssr: false, loading }),
};

export function Visual({ visual }: { visual: VisualSpec }) {
  switch (visual.type) {
    case "numberLine":
      return <S.NumberLine {...visual} />;
    case "fractionBars":
      return <S.FractionBars {...visual} />;
    case "fractionCircle":
      return <S.FractionCircle {...visual} />;
    case "areaModel":
      return <S.AreaModel {...visual} />;
    case "arrayGrid":
      return <S.ArrayGrid {...visual} />;
    case "percentGrid":
      return <S.PercentGrid {...visual} />;
    case "placeValue":
      return <S.PlaceValue {...visual} />;
    case "tapeDiagram":
      return <S.TapeDiagram {...visual} />;
    case "balance":
      return <S.Balance {...visual} />;
    case "factorTree":
      return <S.FactorTree {...visual} />;
    case "exponentBlocks":
      return <S.ExponentBlocks {...visual} />;
    case "sequenceBars":
      return <S.SequenceBars {...visual} />;
    case "triangleAngles":
      return <S.TriangleAngles {...visual} />;
    case "rightTriangle":
      return <S.RightTriangle {...visual} />;
    case "circleExplorer":
      return <S.CircleExplorer {...visual} />;
    case "angleExplorer":
      return <S.AngleExplorer {...visual} />;
    case "functionPlot":
      return <I.FunctionPlot {...visual} />;
    case "slopeExplorer":
      return <I.SlopeExplorer {...visual} />;
    case "lineExplorer":
      return <I.LineExplorer {...visual} />;
    case "parabolaExplorer":
      return <I.ParabolaExplorer {...visual} />;
    case "transformExplorer":
      return <I.TransformExplorer {...visual} />;
    case "exponentialExplorer":
      return <I.ExponentialExplorer {...visual} />;
    case "unitCircle":
      return <I.UnitCircle {...visual} />;
    case "systemExplorer":
      return <I.SystemExplorer {...visual} />;
    case "secantExplorer":
      return <I.SecantExplorer {...visual} />;
    case "stepThrough":
      return <A.StepThrough {...visual} />;
    case "pascalTriangle":
      return <A.PascalTriangle {...visual} />;
  }
}
