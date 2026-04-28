// src/components/CartSidebar.js

import React from "react";

const CartSidebar = ({ isOpen, items, onClose, onCheckout, total }) => {
  if (!isOpen) return null;

  const handlePagarClick = () => {
    const logged = localStorage.getItem("cliente_logueado") === "true";
    if (!logged) {
      alert("Para pagar debes iniciar sesión o crear una cuenta.");
      window.location.href = "/login";
      return;
    }
    onCheckout();
  };

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Tu carrito</h2>
            {items.length > 0 && <p className="text-xs text-gray-400">{items.reduce((a, i) => a + i.quantity, 0)} artículo(s)</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">&times;</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21h6" />
            </svg>
            <p className="text-gray-400 text-base font-medium">Tu carrito está vacío</p>
            <p className="text-gray-300 text-sm mt-1">Agrega productos para comenzar</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productoId || item.id}-${item.measure}`}
                  className="flex gap-3 pb-4 border-b"
                >
                  <div className="w-16 h-16 bg-lime-50 rounded-xl flex items-center justify-center">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.measure === "1kg" || !item.measure
                        ? `${item.cantidadKg ?? item.quantity} kg`
                        : `${item.measure} × ${item.quantity}`}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-emerald-800">S/ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t px-6 py-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-800">S/ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-emerald-900 border-t pt-3">
                <span>Total (sin IGV)</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 font-semibold rounded-full py-2.5 text-sm hover:bg-gray-50">
                  Seguir comprando
                </button>
                <button onClick={handlePagarClick} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-full py-2.5 text-sm">
                  Pagar ahora
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