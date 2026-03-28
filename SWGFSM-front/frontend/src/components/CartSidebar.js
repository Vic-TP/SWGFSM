import React from "react";

const CartSidebar = ({ isOpen, items, onClose, onCheckout }) => {
  if (!isOpen) return null;

  const total = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout(items);   // 👉 solo delega al padre
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Carrito</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id + item.measure}
                  className="flex gap-3 border-b pb-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-contain"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.measure}</p>
                    <p className="text-xs text-gray-500">
                      Cantidad: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-between mb-3">
                <span className="font-semibold">Total</span>
                <span className="font-bold">S/ {total.toFixed(2)}</span>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full py-3 text-sm uppercase tracking-wide"
                  onClick={onClose}
                >
                  CONTINUAR COMPRANDO
                </button>

                <button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full py-3 text-sm uppercase tracking-wide"
                  onClick={handleCheckout}
                >
                  PAGAR AHORA
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartSidebar;
