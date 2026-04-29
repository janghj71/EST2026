import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingContext } from './LoadingContext';

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('로딩중...');
  const msgRef = useRef('로딩중...');

  const showLoading = useCallback((msg = '로딩중...') => {
    msgRef.current = msg;
    setMessage(msg);
    setCount((c) => c + 1);
  }, []);

  const hideLoading = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const withLoading = useCallback(async (fn, msg) => {
    showLoading(msg);
    try {
      return await fn();
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  const api = useMemo(
    () => ({ showLoading, hideLoading, withLoading }),
    [showLoading, hideLoading, withLoading]
  );

  const visible = count > 0;

  return (
    <LoadingContext.Provider value={api}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 cursor-wait">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-10 py-8 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-gray-600">{message}</span>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
