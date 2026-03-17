type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify() {
  for (const l of listeners) l([...toasts]);
}

export function subscribeToToasts(cb: (toasts: Toast[]) => void) {
  listeners.push(cb);
  cb([...toasts]);

  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function showToast(message: string, type: ToastType = "info") {
  const id = Date.now();

  toasts.push({ id, message, type });
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}