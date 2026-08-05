import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080, maxWidth: 360 }}>
        {toasts.map((t) => (
          <div key={t.id} className="caawiye-toast card shadow-lg px-3 py-2 mb-2 d-flex align-items-center gap-2">
            <i
              className={`bi fs-5 ${
                t.type === 'success'
                  ? 'bi-check-circle-fill text-lime'
                  : t.type === 'error'
                    ? 'bi-x-circle-fill text-danger'
                    : 'bi-info-circle-fill text-info'
              }`}
            />
            <span className="small text-break">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}