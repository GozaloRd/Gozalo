/**
 * Evita que errores en rutas async tumben el proceso de Node (Express 4 no los captura solo).
 */
function asyncHandler(fn) {
  return function route(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
