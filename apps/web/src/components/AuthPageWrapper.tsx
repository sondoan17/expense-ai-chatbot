import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, Transition } from 'framer-motion';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';

const transition: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

export function AuthRoutes() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ x: isLogin ? '100%' : '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isLogin ? '-100%' : '100%', opacity: 0 }}
        transition={transition}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
