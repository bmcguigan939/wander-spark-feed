// Shared visual treatment for imported link-card videos.
// Used by feed cards and grid tiles so blank thumbnails get a branded look
// instead of a white box.

export type PlatformKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "x"
  | "travidz"
  | null
  | undefined
  | string;

export type PlatformStyle = {
  /** Tailwind gradient classes (background) */
  gradient: string;
  /** Hex / oklch background for non-tailwind contexts */
  fallbackBg: string;
  /** Display label */
  label: string;
};

export function getPlatformStyle(p: PlatformKey): PlatformStyle {
  switch ((p ?? "").toLowerCase()) {
    case "instagram":
      return {
        gradient: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
        fallbackBg: "#ee2a7b",
        label: "Instagram",
      };
    case "facebook":
      return {
        gradient: "bg-gradient-to-br from-[#1877f2] to-[#0a3a8a]",
        fallbackBg: "#1877f2",
        label: "Facebook",
      };
    case "tiktok":
      return {
        gradient: "bg-gradient-to-br from-[#25f4ee] via-[#0f0f0f] to-[#fe2c55]",
        fallbackBg: "#0f0f0f",
        label: "TikTok",
      };
    case "youtube":
      return {
        gradient: "bg-gradient-to-br from-[#ff0000] to-[#7a0000]",
        fallbackBg: "#ff0000",
        label: "YouTube",
      };
    case "x":
    case "twitter":
      return {
        gradient: "bg-gradient-to-br from-[#1a1a1a] to-[#000000]",
        fallbackBg: "#000000",
        label: "X",
      };
    default:
      return {
        gradient: "bg-gradient-to-br from-card to-background",
        fallbackBg: "#1f1f1f",
        label: "Video",
      };
  }
}