import { useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀","😂","😍","🤩","😎","🥳","😊","😉","😘","🤗",
  "🙌","👏","👍","🔥","💯","❤️","💕","✨","⭐","🌟",
  "🌴","🌊","🏖️","🏝️","🌅","🌄","🏔️","🗻","🏕️","⛺",
  "✈️","🚀","🗺️","🌍","🌎","🌏","🧳","📸","🎒","🛶",
  "🍹","🍕","🍜","🥘","☕","🍺","🐬","🐠","🦩","🦒",
];

export function EmojiPicker({
  onPick,
  className,
  align = "end",
}: {
  onPick: (emoji: string) => void;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Insert emoji"
          className={
            className ??
            "rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          }
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="top"
        className="w-64 p-2"
      >
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPick(e)}
              className="rounded-md p-1 text-lg leading-none hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  insert: string,
): { next: string; caret: number } {
  if (!el) return { next: current + insert, caret: (current + insert).length };
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  return { next, caret: start + insert.length };
}