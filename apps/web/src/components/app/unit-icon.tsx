import { ArrowLeftRight, Compass, FunctionSquare, Hash, ListOrdered, Percent, PieChart, Rocket, Scale, Shapes, Spline, Superscript, Triangle, TrendingUp, Variable, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { ArrowLeftRight, Compass, FunctionSquare, Hash, ListOrdered, Percent, PieChart, Rocket, Scale, Spline, Superscript, Triangle, TrendingUp, Variable };

export function UnitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Shapes;
  return <Icon className={className} />;
}
