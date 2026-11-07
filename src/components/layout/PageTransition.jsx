import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useMatches, useNavigationType, useOutlet } from "react-router-dom";
import { EASE_OUT, pageVariants } from "@/lib/motion";

/**
 * Direction-aware page transition.
 *
 * Forward navigation (a link, the sidebar) enters from the right; going back
 * enters from the left, so the movement matches the mental model of a stack.
 * The key is the pathname by default: changing `?tab=` or `?detail=` must not
 * replay a page transition underneath an open tab or drawer. A route can opt
 * into a stable key with `handle.pageKey` when its pathname encodes internal
 * wizard steps rather than different pages.
 *
 * `subtle` is for the full-viewport routes (chat, product builder): they own
 * their own layout, so they get a shorter travel rather than none.
 */
export default function PageTransition({ subtle = false }) {
  const location = useLocation();
  const matches = useMatches();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return outlet;
  }

  const back = navigationType === "POP";
  const variants = pageVariants(back, subtle ? 12 : 28);

  // Routes whose sub-pages are steps of one flow can opt out of remounting on
  // every URL change with `handle.pageKey`. The wizard keeps its state (and
  // avoids refetching/resetting) while the URL still tracks the active step.
  // Include the record id so switching offers still gets a fresh transition.
  const leaf = matches[matches.length - 1];
  const pageKey = leaf?.handle?.pageKey;
  const transitionKey = pageKey
    ? `${pageKey}:${leaf?.params?.id || "new"}`
    : location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="enter"
        animate="centre"
        exit="exit"
        transition={{ duration: 0.22, ease: EASE_OUT }}
        className="min-w-0"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
