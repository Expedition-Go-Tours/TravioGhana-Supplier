import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/**
 * The workspace's modal primitive — dimmed overlay, white rounded panel and a
 * bold slate title, matching the portal's dialogs (ConfirmDialog). It is built
 * on Radix Dialog so every modal gets a focus trap, Escape handling, scroll
 * locking and `aria-modal` semantics for free.
 *
 * Widths: 540px default, 780px for `wide` (rate plans). The body
 * scrolls inside the panel (90vh cap); the footer stays with the content.
 */
export default function StaysModal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  wide = false,
  children,
  contentClassName,
  overlayClassName,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            overlayClassName,
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-30px)] -translate-x-1/2 -translate-y-1/2 overflow-auto",
            "rounded-2xl bg-white p-6 shadow-2xl outline-none",
            wide ? "max-w-[780px]" : "max-w-[540px]",
            contentClassName,
          )}
        >
          {title && (
            <Dialog.Title className="m-0 text-lg font-bold text-slate-900">
              {title}
            </Dialog.Title>
          )}
          {description && (
            <Dialog.Description className="m-0 mt-1.5 text-sm leading-relaxed text-slate-500">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-5">{children}</div>
          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A close-only footer, used by preview/notification modals. */
export function StaysModalClose({ children }) {
  return (
    <Dialog.Close asChild>
      {children}
    </Dialog.Close>
  );
}
