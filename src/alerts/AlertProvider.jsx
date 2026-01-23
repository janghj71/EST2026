import React, { useCallback, useMemo, useRef, useState } from "react";
import AlertModal from "../components/AlertModal";
import { AlertContext } from "./AlertContext";

// export const AlertContext = createContext(null);

const normalize = (opt) => ({
  type: opt?.type ?? "info",
  title: opt?.title,
  message: opt?.message ?? "",
  confirmText: opt?.confirmText ?? "확인",
  cancelText: opt?.cancelText ?? "취소",
  showCancel: !!opt?.showCancel,
  closeOnBackdrop: opt?.closeOnBackdrop !== false,
});

export function AlertProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(normalize({}));
  const resolverRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const resolve = useCallback((val) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(val);
  }, []);

  const openAlert = useCallback((opt) => {
    const o = normalize(opt);
    setOptions(o);
    setOpen(true);

    return new Promise((resolvePromise) => {
      resolverRef.current = resolvePromise;
    });
  }, []);

  const api = useMemo(() => {
    const info = (message, title) => openAlert({ type: "info", title, message, showCancel: false });
    const success = (message, title) => openAlert({ type: "success", title, message, showCancel: false });
    const warning = (message, title) => openAlert({ type: "warning", title, message, showCancel: false });
    const error = (message, title) => openAlert({ type: "error", title, message, showCancel: false });

    const confirm = (message, title, opt) =>
      openAlert({
        type: "confirm",
        title,
        message,
        showCancel: true,
        confirmText: opt?.confirmText ?? "확인",
        cancelText: opt?.cancelText ?? "취소",
      });

    const remove = (message, title, opt) =>
      openAlert({
        type: "remove",
        title,
        message,
        showCancel: true,
        confirmText: opt?.confirmText ?? "삭제",
        cancelText: opt?.cancelText ?? "취소",
      });

    return { open: openAlert, close, info, success, warning, error, confirm, remove };
  }, [close, openAlert]);

  return (
    <AlertContext.Provider value={api}>
      {children}
      <AlertModal
        open={open}
        type={options.type}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        showCancel={options.showCancel}
        onClose={() => {
          if (options.closeOnBackdrop) {
            close();
            resolve(false);
          }
        }}
        onCancel={() => {
          close();
          resolve(false);
        }}
        onConfirm={() => {
          close();
          resolve(true);
        }}
      />
    </AlertContext.Provider>
  );
}



