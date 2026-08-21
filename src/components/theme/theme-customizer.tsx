"use client";

import { useState, useEffect } from "react";
import { useTheme, ThemeConfig, DEFAULT_THEME } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, RotateCcw, Save, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Preset Palettes ─────────────────────────────────────────────────────────
const PRESET_THEMES: Array<{ name: string; config: ThemeConfig }> = [
  {
    name: "Clean White",
    config: {
      primaryColor: "#4f46e5",
      sidebarColor: "#FFFFFF",
      sidebarActiveColor: "#4f46e5",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#f59e0b",
      textColor: "#0f172a",
      textHoverColor: "#4f46e5",
      borderRadius: "0.625rem",
    },
  },
  {
    name: "Modern Indigo",
    config: {
      primaryColor: "#4f46e5",
      sidebarColor: "#0f172a",
      sidebarActiveColor: "#6366f1",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#6366f1",
      textColor: "#0f172a",
      textHoverColor: "#6366f1",
      borderRadius: "0.625rem",
    },
  },
  {
    name: "Navy Dark",
    config: {
      primaryColor: "#1a1a2e",
      sidebarColor: "#1a1a2e",
      sidebarActiveColor: "#2e2e4a",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#f59e0b",
      textColor: "#0f172a",
      textHoverColor: "#f59e0b",
      borderRadius: "0.625rem",
    },
  },
  {
    name: "Corporate Red",
    config: {
      primaryColor: "#E01E25",
      sidebarColor: "#FFFFFF",
      sidebarActiveColor: "#E01E25",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#fbbf24",
      textColor: "#0f172a",
      textHoverColor: "#E01E25",
      borderRadius: "0.625rem",
    },
  },
  {
    name: "Forest Green",
    config: {
      primaryColor: "#15803d",
      sidebarColor: "#FFFFFF",
      sidebarActiveColor: "#15803d",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#84cc16",
      textColor: "#0f172a",
      textHoverColor: "#15803d",
      borderRadius: "0.5rem",
    },
  },
  {
    name: "Royal Purple",
    config: {
      primaryColor: "#6d28d9",
      sidebarColor: "#FFFFFF",
      sidebarActiveColor: "#6d28d9",
      sidebarActiveTextColor: "#FFFFFF",
      accentColor: "#a78bfa",
      textColor: "#0f172a",
      textHoverColor: "#6d28d9",
      borderRadius: "0.75rem",
    },
  },
];

interface ThemeCustomizerProps {
  onClose?: () => void;
}

export function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { theme, setTheme, resetTheme, isSaving } = useTheme();
  const [local, setLocal] = useState<ThemeConfig>(theme);
  const [previewHover, setPreviewHover] = useState(false);

  // Sync local state if external theme changes
  useEffect(() => {
    setLocal(theme);
  }, [theme]);

  // Commit staged local changes to global theme + DB
  const handleApply = async () => {
    await setTheme(local);
    toast.success("Theme applied and saved to database!");
  };

  // Reset everything back to DEFAULT_THEME
  const handleReset = async () => {
    await resetTheme();
    setLocal(DEFAULT_THEME);
    toast.info("Theme reset to system default");
  };

  // Preset selection immediately applies and stages the preset
  const handlePreset = async (preset: ThemeConfig) => {
    setLocal(preset);
    await setTheme(preset);
    toast.success(`Preset loaded & saved!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Palette className="h-5 w-5" style={{ color: local.accentColor }} /> Theme Customization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the portal appearance. Changes are saved to database.
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg cursor-pointer">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Preset Themes */}
      <Card className="border-border/50 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Preset Themes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_THEMES.map((preset) => {
              const isSelected =
                local.primaryColor.toLowerCase() === preset.config.primaryColor.toLowerCase() &&
                local.sidebarColor.toLowerCase() === preset.config.sidebarColor.toLowerCase();
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePreset(preset.config)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all hover:scale-[1.03] cursor-pointer text-left",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/20 shadow-xs"
                      : "border-border/40 hover:border-border bg-card/60"
                  )}
                  style={isSelected ? { borderColor: preset.config.accentColor } : {}}
                >
                  <div className="flex gap-1.5">
                    <div
                      className="h-4 w-4 rounded-full border border-slate-300/80 shadow-xs"
                      style={{ backgroundColor: preset.config.sidebarColor }}
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-slate-300/80 shadow-xs"
                      style={{ backgroundColor: preset.config.primaryColor }}
                    />
                    <div
                      className="h-4 w-4 rounded-full border border-slate-300/80 shadow-xs"
                      style={{ backgroundColor: preset.config.accentColor }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-center leading-tight">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card className="border-border/50 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Custom Colors & Styling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Primary Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Primary Color</Label>
              <p className="text-[11px] text-muted-foreground">Buttons, primary UI highlights</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#4f46e5"
              />
            </div>
          </div>

          {/* Sidebar Background Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Sidebar Background</Label>
              <p className="text-[11px] text-muted-foreground">Navigation sidebar background</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.sidebarColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.sidebarColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* Sidebar Active Item Background */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Sidebar Active Item Background</Label>
              <p className="text-[11px] text-muted-foreground">Highlighted nav item background</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.sidebarActiveColor || local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarActiveColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.sidebarActiveColor || local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarActiveColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#4f46e5"
              />
            </div>
          </div>

          {/* Sidebar Active Item Text Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Sidebar Active Item Text</Label>
              <p className="text-[11px] text-muted-foreground">Text & icon color on active nav item</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.sidebarActiveTextColor || "#FFFFFF"}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarActiveTextColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.sidebarActiveTextColor || "#FFFFFF"}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, sidebarActiveTextColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Accent / Highlight</Label>
              <p className="text-[11px] text-muted-foreground">Active indicator bars, badges</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.accentColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, accentColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.accentColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, accentColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#f59e0b"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Text Color</Label>
              <p className="text-[11px] text-muted-foreground">Headings, typography, body text</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.textColor || "#0f172a"}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, textColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.textColor || "#0f172a"}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, textColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#0f172a"
              />
            </div>
          </div>

          {/* Text Hover Color */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Hover Text Color</Label>
              <p className="text-[11px] text-muted-foreground">Links and interactive text on hover</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="color"
                value={local.textHoverColor || local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, textHoverColor: e.target.value }))
                }
                className="h-8 w-11 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
              />
              <Input
                value={local.textHoverColor || local.primaryColor}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, textHoverColor: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8 uppercase"
                placeholder="#4f46e5"
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground">Border Radius</Label>
              <p className="text-[11px] text-muted-foreground">Rounding for cards, buttons</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                value={local.borderRadius}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, borderRadius: e.target.value }))
                }
                className="w-24 text-xs font-mono h-8"
                placeholder="0.625rem"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="border-border/50 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Sidebar Item Preview */}
          <div
            className="rounded-xl p-4 flex items-center gap-3 transition-colors duration-200 border border-border/40"
            style={{ backgroundColor: local.sidebarColor }}
          >
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: local.accentColor }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: local.sidebarColor.toLowerCase() === "#ffffff" ? "#475569" : "#cbd5e1" }}
            >
              Sidebar Nav
            </span>
            <div
              className="ml-auto px-3 py-1.5 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
              style={{
                backgroundColor: local.sidebarActiveColor || local.primaryColor,
                color: local.sidebarActiveTextColor || "#FFFFFF",
                borderRadius: local.borderRadius,
                borderLeft: `3px solid ${local.accentColor}`,
              }}
            >
              Active Item
            </div>
          </div>

          {/* Typography & Hover Preview */}
          <div className="p-3 rounded-xl border border-border/60 bg-card transition-colors">
            <p className="text-xs font-bold tracking-tight" style={{ color: local.textColor || "#0f172a" }}>
              Typography & Headings Preview
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: local.textColor || "#0f172a", opacity: 0.8 }}>
              Body text and table content cascade to this custom text color.
            </p>
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">Interactive Link:</span>
              <a
                href="#preview"
                onMouseEnter={() => setPreviewHover(true)}
                onMouseLeave={() => setPreviewHover(false)}
                className="inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                style={{
                  color: previewHover
                    ? (local.textHoverColor || local.primaryColor)
                    : (local.textColor || "#0f172a"),
                }}
              >
                Hover over this link <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Action Buttons Preview */}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 px-4 py-2 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: local.primaryColor, borderRadius: local.borderRadius }}
            >
              Primary Button
            </button>
            <button
              type="button"
              className="flex-1 px-4 py-2 text-slate-950 text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: local.accentColor, borderRadius: local.borderRadius }}
            >
              Accent Button
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-2">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="gap-2 rounded-xl text-xs cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset Default
        </Button>
        <Button
          onClick={handleApply}
          disabled={isSaving}
          className="gap-2 rounded-xl text-xs cursor-pointer"
          style={{ backgroundColor: local.primaryColor, borderRadius: local.borderRadius }}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {isSaving ? "Saving..." : "Apply & Save"}
        </Button>
      </div>
    </div>
  );
}
