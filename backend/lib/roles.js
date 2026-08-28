// Autorizacion por rol. La autenticacion ya la resolvio requireAuth (auth.mjs),
// que dejo la sesion en res.locals.session; aca solo se decide si ESE usuario
// puede usar el router.
//
// El rol se lee SIEMPRE de la sesion del servidor, nunca de un header o del
// body: el frontend esconde las secciones que no corresponden, pero eso es
// cosmetico y la API tiene que negarse igual si alguien la llama a mano.
const requireRol = (...roles) => (req, res, next) => {
  const rol = res.locals.session?.user?.rol;

  if (!rol || !roles.includes(rol)) {
    return res.status(403).json({ message: 'No tenés permiso para acceder a esta sección.' });
  }

  next();
};

module.exports = { requireRol };
