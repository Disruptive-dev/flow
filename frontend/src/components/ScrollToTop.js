import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Forces window scroll to top on every route change.
 * Also helps mitigate "white page after back navigation" issues by
 * ensuring layout reflows.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
  }, [pathname]);
  return null;
}
