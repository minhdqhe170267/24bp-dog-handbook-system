import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { normalizeApiError } from '../services/apiError';
import { Dog, Loader2, AlertCircle, Eye, EyeOff, User, Lock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function FloatingParticle({ delay, size, x, y }) {
  return (
    <motion.div
      className="absolute rounded-full bg-accent/20"
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      const message = 'Vui lòng nhập đầy đủ thông tin.';
      setError(message);
      return;
    }
    setLoading(true);
    try {
      const loggedUser = await login(username, password);
      if (loggedUser?.role === 'TRAINER') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const message = 'Tài khoản Huấn luyện viên không có quyền truy cập Web Admin.';
        setError(message);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      const normalizedError = normalizeApiError(err);
      const message = normalizedError.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const particles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.5, size: 4 + Math.random() * 8, x: Math.random() * 100, y: Math.random() * 100,
  }));

  return (
    <div className="min-h-screen flex overflow-hidden login-light-scope">
      {/* Left Panel - Branding */}
      <motion.div
        className="hidden lg:flex lg:w-[55%] relative gradient-navy items-center justify-center p-12 overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/5 blur-[80px] animate-pulse-ring" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-accent/[0.08] blur-[60px] animate-pulse-ring" style={{ animationDelay: '1.5s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(217 91% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217 91% 60%) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-lg">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <Dog className="h-8 w-8 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">24BP DHS</h1>
                <p className="text-sm text-primary-foreground/60">Dog Handbook System</p>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-primary-foreground leading-tight mb-4">
              Hệ thống quản lý<br />
              <span className="text-gradient">Sổ tay chó nghiệp vụ</span>
            </h2>
            <p className="text-primary-foreground/50 text-lg leading-relaxed mb-10">
              Nền tảng quản trị nội dung chuyên nghiệp cho huấn luyện, chăm sóc sức khỏe và dinh dưỡng chó nghiệp vụ quân đội.
            </p>
          </motion.div>

        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <motion.div
          className="w-full max-w-[420px] relative z-10"
          initial={{ y: 30, opacity: 0 }}
          animate={mounted ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Dog className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="text-xl font-bold">24BP Dog Handbook</h1>
            <p className="text-sm text-muted-foreground">Hệ thống quản lý sổ tay chó nghiệp vụ</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Đăng nhập</h2>
            <p className="text-muted-foreground mt-1">Nhập thông tin tài khoản để truy cập hệ thống</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/10 p-3.5 rounded-lg border border-destructive/15"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  autoFocus
                  className="w-full h-11 pl-10 bg-muted/50 border border-border/60 rounded-lg text-sm outline-none focus:bg-card focus:border-accent/40 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full h-11 pl-10 pr-10 bg-muted/50 border border-border/60 rounded-lg text-sm outline-none focus:bg-card focus:border-accent/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-primary text-accent-foreground font-semibold rounded-lg shadow-glow hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Đăng nhập
              {!loading && <ChevronRight className="h-4 w-4" />}
            </button>

          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
