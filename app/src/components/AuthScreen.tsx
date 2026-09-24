import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Radio, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);

  const mut = useMutation({
    mutationFn: async () => {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim() || undefined);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate();
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      <div className="aurora" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative z-10 w-[min(92vw,420px)] rounded-3xl p-8"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient text-black shadow-lg">
            <Radio size={26} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Sonora
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === "login" ? "С возвращением" : "Создайте аккаунт"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg py-2 font-medium transition",
                mode === m ? "bg-white text-black" : "text-white/60 hover:text-white",
              )}
            >
              {m === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {mode === "register" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Field icon={<UserIcon size={16} />}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Имя (необязательно)"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field icon={<Mail size={16} />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
          </Field>
          <Field icon={<Lock size={16} />}>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (мин. 6)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
          </Field>

          {mut.isError && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
              {(mut.error as Error).message === "invalid email or password"
                ? "Неверный email или пароль"
                : (mut.error as Error).message === "email already registered"
                  ? "Этот email уже зарегистрирован"
                  : "Ошибка. Попробуйте ещё раз"}
            </p>
          )}

          <button
            type="submit"
            disabled={mut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl accent-gradient py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {mut.isPending && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-white/40">
          Музыка из SoundCloud и Audius. Загружайте свои треки.
        </p>
      </motion.div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 focus-within:border-accent/50">
      <span className="text-white/40">{icon}</span>
      {children}
    </div>
  );
}
