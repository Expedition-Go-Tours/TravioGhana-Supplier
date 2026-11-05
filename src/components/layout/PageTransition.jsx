import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigationType, useOutlet } from "react-router-dom";
import { EASE_OUT, pageVariants } from "@/lib/motion";

/**
 * Direction-aware page transition.
 *
 * Forward navigation (a link, the sidebar) enters from the right; going back
 * enters from the left, so the movement matches the mental model of a stack.
 * The key is the pathname only: changing `?tab=` or `?detail=` must not replay
 * a page transition underneath an open tab or drawer.
 *
 * `subtle` is for the full-viewport routes (chat, product builder): they own
 * their own layout, so they get a shorter travel rather than none.
 */
export default function PageTransition({ subtle = false }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return outlet;
  }

  const back = navigationType === "POP";
  const variants = pageVariants(back, subtle ? 12 : 28);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
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
